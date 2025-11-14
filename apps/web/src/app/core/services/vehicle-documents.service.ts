import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { injectSupabase } from './supabase-client.service';
import { CarOwnerNotificationsService } from './car-owner-notifications.service';
import { CarsService } from './cars.service';

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
  car_id: string;
  kind: VehicleDocumentKind;
  storage_path: string;
  status: VehicleDocumentStatus;
  expiry_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  verified_by?: string;
  verified_at?: string;
}

export interface UploadDocumentParams {
  car_id: string;
  kind: VehicleDocumentKind;
  file: File;
  expiry_date?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class VehicleDocumentsService {
  private readonly supabase = injectSupabase();
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
        .eq('car_id', carId)
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
    const { car_id, kind, file, expiry_date, notes } = params;

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
        car_id,
        kind,
        storage_path: storagePath,
        status: 'pending',
        expiry_date,
        notes,
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
      const car = await this.carsService.getCarById(document.car_id);
      if (!car) return;

      const carName = car.title || `${car.brand || ''} ${car.model || ''}`.trim() || 'tu auto';
      const documentType = this.getDocumentKindLabel(document.kind);
      const documentsUrl = `/cars/${document.car_id}/documents`;

      this.carOwnerNotifications.notifyDocumentStatusChanged(
        documentType,
        carName,
        'verified' as any, // Se acaba de subir, está pendiente
        undefined,
        documentsUrl,
      );
    } catch (error) {
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
      console.warn('Error deleting file from storage:', storageError);
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
   * Verificar si un auto tiene todos los documentos requeridos
   */
  async hasRequiredDocuments(carId: string): Promise<boolean> {
    const requiredKinds: VehicleDocumentKind[] = [
      'registration',
      'insurance',
      'technical_inspection',
    ];

    const { data, error } = await this.supabase
      .from('vehicle_documents')
      .select('kind, status')
      .eq('car_id', carId)
      .in('kind', requiredKinds)
      .eq('status', 'verified');

    if (error) {
      console.error('Error checking required documents:', error);
      return false;
    }

    const verifiedKinds = new Set((data || []).map((d) => d.kind));
    return requiredKinds.every((kind) => verifiedKinds.has(kind));
  }

  /**
   * Obtener lista de documentos faltantes para un auto
   */
  async getMissingDocuments(carId: string): Promise<VehicleDocumentKind[]> {
    const requiredKinds: VehicleDocumentKind[] = [
      'registration',
      'insurance',
      'technical_inspection',
    ];

    const { data, error } = await this.supabase
      .from('vehicle_documents')
      .select('kind, status')
      .eq('car_id', carId)
      .in('kind', requiredKinds)
      .eq('status', 'verified');

    if (error) {
      console.error('Error checking documents:', error);
      return requiredKinds; // Si hay error, asumir que faltan todos
    }

    const verifiedKinds = new Set((data || []).map((d) => d.kind));
    return requiredKinds.filter((kind) => !verifiedKinds.has(kind));
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
          filter: `car_id=eq.${carId}`,
        },
        async (payload) => {
          const document = payload.new as VehicleDocument;

          // Solo notificar si cambió el status a verified o rejected
          if (document.status === 'verified' || document.status === 'rejected') {
            callback(document);
          }
        },
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  /**
   * Obtener documentos próximos a vencer (30 días)
   */
  getExpiringDocuments(carId: string): Observable<VehicleDocument[]> {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return from(
      this.supabase
        .from('vehicle_documents')
        .select('*')
        .eq('car_id', carId)
        .eq('status', 'verified')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0]),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as VehicleDocument[]) || [];
      }),
      catchError(() => of([])),
    );
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
