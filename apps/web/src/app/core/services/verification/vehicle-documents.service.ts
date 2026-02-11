import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { CarOwnerNotificationsService } from '@core/services/cars/car-owner-notifications.service';
import { CarsService } from '@core/services/cars/cars.service';
import { DEFAULT_DOCUMENT_MIME_TYPES, validateFile } from '@core/utils/file-validation.util';

/**
 * VehicleDocumentsService
 *
 * Servicio para gestión de documentos del vehículo.
 *
 * Documentos soportados:
 * - registration: Cédula verde/título de propiedad
 * - insurance: Póliza de seguro
 * - technical_inspection: Revisión técnica (VTV)
 * - circulation_permit: Permiso de circulación
 * - ownership_proof: Comprobante de titularidad
 *
 * Estados:
 * - pending: Subido, esperando verificación
 * - verified: Verificado por admin
 * - rejected: Rechazado por admin
 *
 * Storage:
 * - Bucket: 'vehicle-documents'
 * - Path: {car_id}/{document_kind}_{timestamp}.{ext}
 */

export type VehicleDocumentKind =
  | 'registration'
  | 'insurance'
  | 'technical_inspection'
  | 'circulation_permit'
  | 'ownership_proof';

export type VehicleDocumentStatus = 'pending' | 'verified' | 'rejected';

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  user_id: string;
  is_owner: boolean;
  // Green card (cédula verde)
  green_card_url?: string;
  green_card_owner_name?: string;
  green_card_vehicle_domain?: string;
  green_card_verified_at?: string;
  green_card_ai_score?: number;
  green_card_ai_metadata?: Record<string, unknown>;
  // Blue card (cédula azul)
  blue_card_url?: string;
  blue_card_authorized_name?: string;
  blue_card_verified_at?: string;
  blue_card_ai_score?: number;
  blue_card_ai_metadata?: Record<string, unknown>;
  // VTV
  vtv_url?: string;
  vtv_expiry?: string;
  vtv_verified_at?: string;
  // Insurance
  insurance_url?: string;
  insurance_expiry?: string;
  insurance_company?: string;
  insurance_policy_number?: string;
  insurance_verified_at?: string;
  // Manual review
  manual_review_required?: boolean;
  manual_reviewed_by?: string;
  manual_reviewed_at?: string;
  manual_review_notes?: string;
  manual_review_decision?: string;
  // Common
  status?: VehicleDocumentStatus;
  created_at: string;
  updated_at: string;
}

export interface UploadDocumentParams {
  car_id: string;
  kind: VehicleDocumentKind;
  file: File;
  expiry_date?: string;
  notes?: string;
}

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB

@Injectable({
  providedIn: 'root',
})
export class VehicleDocumentsService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);
  private readonly BUCKET_NAME = 'vehicle-documents';
  private readonly carOwnerNotifications = inject(CarOwnerNotificationsService);
  private readonly carsService = inject(CarsService);

  /**
   * Obtener todos los documentos de un vehículo
   */
  getCarDocuments(carId: string): Observable<VehicleDocument[]> {
    return from(
      this.supabase
        .from('vehicle_documents')
        .select('*')
        .eq('vehicle_id', carId)
        .order('created_at', { ascending: false }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as VehicleDocument[]) || [];
      }),
      catchError((error) => {
        console.error('Error fetching car documents:', error);
        return of([]);
      }),
    );
  }

  /**
   * Obtener un documento específico
   */
  getDocument(documentId: string): Observable<VehicleDocument | null> {
    return from(
      this.supabase.from('vehicle_documents').select('*').eq('id', documentId).single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return data as VehicleDocument;
      }),
      catchError(() => of(null)),
    );
  }

  /**
   * Subir un documento
   */
  async uploadDocument(params: UploadDocumentParams): Promise<VehicleDocument> {
    const { car_id, kind, file } = params;

    const validation = validateFile(file, {
      maxSizeBytes: MAX_UPLOAD_BYTES,
      allowedMimeTypes: DEFAULT_DOCUMENT_MIME_TYPES,
    });

    if (!validation.valid) {
      throw new Error(validation.error || 'Archivo no válido');
    }

    // 1. Upload file to storage
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const fileName = `${kind}_${timestamp}.${ext}`;
    const storagePath = `${car_id}/${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Error uploading file: ${uploadError.message}`);
    }

    // 2. Create database record
    const { data, error: dbError } = await this.supabase
      .from('vehicle_documents')
      .insert({
        vehicle_id: car_id,
        user_id: (await this.supabase.auth.getUser()).data.user?.id,
        is_owner: true,
        status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: delete uploaded file
      await this.supabase.storage.from(this.BUCKET_NAME).remove([storagePath]);
      throw new Error(`Error creating document record: ${dbError.message}`);
    }

    const document = data as VehicleDocument;

    // ✅ NUEVO: Notificar al usuario que el documento fue subido
    this.notifyDocumentUploaded(document).catch(() => {
      // Silently fail - notification is optional
    });

    return document;
  }

  /**
   * Notifica al usuario cuando se sube un documento
   */
  private async notifyDocumentUploaded(document: VehicleDocument): Promise<void> {
    try {
      const car = await this.carsService.getCarById(document.vehicle_id);
      if (!car) return;

      const carName = car.title || `${car.brand || ''} ${car.model || ''}`.trim() || 'tu auto';
      const documentType = 'Documentación del vehículo';
      const documentsUrl = `/cars/${document.vehicle_id}/documents`;

      this.carOwnerNotifications.notifyDocumentStatusChanged(
        documentType,
        carName,
        'verified',
        undefined,
        documentsUrl,
      );
    } catch {
      // Silently fail
    }
  }

  /**
   * Actualizar un documento (solo si está pending)
   */
  async updateDocument(
    documentId: string,
    updates: { expiry_date?: string; notes?: string },
  ): Promise<void> {
    const { error } = await this.supabase
      .from('vehicle_documents')
      .update(updates)
      .eq('id', documentId)
      .eq('status', 'pending'); // Solo se puede actualizar si está pending

    if (error) {
      throw new Error(`Error updating document: ${error.message}`);
    }
  }

  /**
   * Eliminar un documento (solo si está pending)
   */
  async deleteDocument(documentId: string): Promise<void> {
    // 1. Get document to get storage path
    const { data: doc, error: fetchError } = await this.supabase
      .from('vehicle_documents')
      .select('storage_path, status')
      .eq('id', documentId)
      .single();

    if (fetchError) {
      throw new Error(`Error fetching document: ${fetchError.message}`);
    }

    if (doc.status !== 'pending') {
      throw new Error('Cannot delete verified or rejected documents');
    }

    // 2. Delete from storage
    const { error: storageError } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .remove([doc.storage_path]);

    if (storageError) {
      this.logger.warn('Error deleting file from storage:', 'VehicleDocumentsService', storageError);
      // Continue anyway - mejor borrar el registro aunque falle el storage
    }

    // 3. Delete from database
    const { error: deleteError } = await this.supabase
      .from('vehicle_documents')
      .delete()
      .eq('id', documentId)
      .eq('status', 'pending');

    if (deleteError) {
      throw new Error(`Error deleting document: ${deleteError.message}`);
    }
  }

  /**
   * Obtener URL pública de un documento
   */
  async getDocumentUrl(storagePath: string): Promise<string> {
    const { data } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(storagePath, 3600); // 1 hour

    if (!data?.signedUrl) {
      throw new Error('Could not generate signed URL');
    }

    return data.signedUrl;
  }

  /**
   * Verificar si un auto tiene todos los documentos requeridos y vigentes.
   *
   * SEGURIDAD: Valida que VTV y seguro NO estén vencidos.
   */
  async hasRequiredDocuments(carId: string): Promise<boolean> {
    // Check if vehicle has verified documents (green_card, vtv, insurance)
    const { data, error } = await this.supabase
      .from('vehicle_documents')
      .select(
        'green_card_verified_at, vtv_verified_at, vtv_expiry, insurance_verified_at, insurance_expiry',
      )
      .eq('vehicle_id', carId)
      .single();

    if (error) {
      console.error('Error checking required documents:', error);
      return false;
    }

    // Verificar que documentos existan
    if (!data?.green_card_verified_at || !data?.vtv_verified_at || !data?.insurance_verified_at) {
      return false;
    }

    // Verificar que VTV y seguro NO estén vencidos
    const now = new Date();

    if (data.vtv_expiry) {
      const vtvExpiry = new Date(data.vtv_expiry);
      if (vtvExpiry < now) {
        this.logger.warn(`VTV expired for car ${carId}: ${data.vtv_expiry}`, 'VehicleDocumentsService');
        return false;
      }
    }

    if (data.insurance_expiry) {
      const insuranceExpiry = new Date(data.insurance_expiry);
      if (insuranceExpiry < now) {
        this.logger.warn(`Insurance expired for car ${carId}: ${data.insurance_expiry}`, 'VehicleDocumentsService');
        return false;
      }
    }

    return true;
  }

  /**
   * Obtener lista de documentos faltantes o vencidos para un auto.
   *
   * @returns Array de tipos de documento faltantes o expirados
   */
  async getMissingDocuments(carId: string): Promise<VehicleDocumentKind[]> {
    const { data, error } = await this.supabase
      .from('vehicle_documents')
      .select(
        'green_card_verified_at, vtv_verified_at, vtv_expiry, insurance_verified_at, insurance_expiry',
      )
      .eq('vehicle_id', carId)
      .single();

    if (error) {
      console.error('Error checking documents:', error);
      return ['registration', 'insurance', 'technical_inspection']; // All missing
    }

    const missing: VehicleDocumentKind[] = [];
    const now = new Date();

    // Cédula verde - solo verificar existencia
    if (!data?.green_card_verified_at) {
      missing.push('registration');
    }

    // Seguro - verificar existencia y vigencia
    if (!data?.insurance_verified_at) {
      missing.push('insurance');
    } else if (data.insurance_expiry && new Date(data.insurance_expiry) < now) {
      missing.push('insurance'); // Expired counts as missing
    }

    // VTV - verificar existencia y vigencia
    if (!data?.vtv_verified_at) {
      missing.push('technical_inspection');
    } else if (data.vtv_expiry && new Date(data.vtv_expiry) < now) {
      missing.push('technical_inspection'); // Expired counts as missing
    }

    return missing;
  }

  /**
   * Obtener documentos que vencen pronto (próximos 30 días).
   *
   * @param carId - ID del vehículo
   * @returns Documentos próximos a vencer con días restantes
   */
  async getExpiringDocuments(
    carId: string,
  ): Promise<{ type: VehicleDocumentKind; expiryDate: Date; daysLeft: number }[]> {
    const { data, error } = await this.supabase
      .from('vehicle_documents')
      .select('vtv_expiry, insurance_expiry')
      .eq('vehicle_id', carId)
      .single();

    if (error || !data) {
      return [];
    }

    const expiring: { type: VehicleDocumentKind; expiryDate: Date; daysLeft: number }[] = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (data.vtv_expiry) {
      const vtvExpiry = new Date(data.vtv_expiry);
      if (vtvExpiry > now && vtvExpiry <= thirtyDaysFromNow) {
        const daysLeft = Math.ceil((vtvExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        expiring.push({ type: 'technical_inspection', expiryDate: vtvExpiry, daysLeft });
      }
    }

    if (data.insurance_expiry) {
      const insuranceExpiry = new Date(data.insurance_expiry);
      if (insuranceExpiry > now && insuranceExpiry <= thirtyDaysFromNow) {
        const daysLeft = Math.ceil(
          (insuranceExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        expiring.push({ type: 'insurance', expiryDate: insuranceExpiry, daysLeft });
      }
    }

    return expiring.sort((a, b) => a.daysLeft - b.daysLeft);
  }

  /**
   * Suscribirse a cambios de estado de documentos para notificar al usuario
   *
   * @param carId - ID del auto
   * @param callback - Callback cuando cambia el estado
   */
  subscribeToDocumentStatusChanges(
    carId: string,
    callback: (document: VehicleDocument) => void,
  ): () => void {
    const channel = this.supabase
      .channel(`vehicle-documents-${carId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vehicle_documents',
          filter: `vehicle_id=eq.${carId}`,
        },
        async (payload) => {
          const document = payload.new as VehicleDocument;

          // Solo notificar si cambió el status a verified o rejected
          if (document.status === 'verified' || document.status === 'rejected') {
            callback(document);
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.logger.debug('Realtime subscription active', 'VehicleDocumentsService');
        }
      });

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  /**
   * Labels para tipos de documentos
   */
  getDocumentKindLabel(kind: VehicleDocumentKind): string {
    const labels: Record<VehicleDocumentKind, string> = {
      registration: 'Cédula Verde / Título',
      insurance: 'Póliza de Seguro',
      technical_inspection: 'Revisión Técnica (VTV)',
      circulation_permit: 'Permiso de Circulación',
      ownership_proof: 'Comprobante de Titularidad',
    };
    return labels[kind];
  }

  /**
   * Labels para estados
   */
  getStatusLabel(status: VehicleDocumentStatus): string {
    const labels: Record<VehicleDocumentStatus, string> = {
      pending: 'Pendiente de Verificación',
      verified: 'Verificado',
      rejected: 'Rechazado',
    };
    return labels[status];
  }

  /**
   * Iconos para tipos de documentos
   */
  getDocumentKindIcon(kind: VehicleDocumentKind): string {
    const icons: Record<VehicleDocumentKind, string> = {
      registration: '📋',
      insurance: '🛡️',
      technical_inspection: '🔧',
      circulation_permit: '🚦',
      ownership_proof: '📄',
    };
    return icons[kind];
  }
}
