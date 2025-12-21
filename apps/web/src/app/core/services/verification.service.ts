import { LoggerService } from './logger.service';
import { Injectable, inject, signal } from '@angular/core';
import type { UserDocument, UserVerificationStatus, VerificationRole } from '../models';
import type { Database } from '../types/database.types';
import { SupabaseClientService } from './supabase-client.service';

export interface VerificationStatus {
  status: 'PENDIENTE' | 'VERIFICADO' | 'RECHAZADO';
  missing_docs: string[]; // IDs de documentos faltantes (ej: 'license_front', 'license_back')
  notes?: string;
}

type UserVerificationRow = Database['public']['Tables']['user_verifications']['Row'];
type UserDocumentRow = Database['public']['Tables']['user_documents']['Row'];

/**
 * Tipos de documento válidos según el enum de la base de datos.
 * SECURITY: Previene SQL injection validando contra whitelist.
 */
const VALID_DOC_TYPES = [
  'gov_id_front',
  'gov_id_back',
  'driver_license',
  'license_front',
  'license_back',
  'vehicle_registration',
  'vehicle_insurance',
  'utility_bill',
  'selfie',
] as const;

type ValidDocType = (typeof VALID_DOC_TYPES)[number];

/**
 * Valida que el tipo de documento sea uno de los permitidos.
 * @throws Error si el tipo no es válido
 */
function validateDocType(docType: string): asserts docType is ValidDocType {
  if (!VALID_DOC_TYPES.includes(docType as ValidDocType)) {
    throw new Error(
      `Tipo de documento inválido: "${docType}". ` +
      `Tipos válidos: ${VALID_DOC_TYPES.join(', ')}`
    );
  }
}

@Injectable({
  providedIn: 'root',
})
export class VerificationService {
  private readonly logger = inject(LoggerService);
  private supabase = inject(SupabaseClientService).getClient();

  // Reactive state consumed by guards/widgets/pages
  readonly statuses = signal<UserVerificationStatus[]>([]);
  readonly documents = signal<UserDocument[]>([]);
  readonly loadingStatuses = signal(false);
  readonly loadingDocuments = signal(false);

  /**
   * Sube una imagen de documento al bucket seguro y crea/actualiza el registro en user_documents.
   *
   * SECURITY:
   * - Valida docType contra whitelist antes de usar en queries
   * - Rollback automático: si el registro en DB falla, elimina el archivo subido
   *
   * @param file - Archivo de imagen a subir
   * @param docType - Tipo de documento (debe ser uno de VALID_DOC_TYPES)
   * @returns Path del archivo subido
   * @throws Error si el tipo de documento es inválido o si falla la operación
   */
  async uploadDocument(
    file: File,
    docType: string,
  ): Promise<string> {
    // SECURITY FIX #1: Validar docType contra whitelist antes de usar
    validateDocType(docType);

    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${docType}_${Date.now()}.${fileExt}`;

    // Subir al bucket 'verification-docs' (asumimos que existe y es privado)
    const { error: uploadError } = await this.supabase.storage
      .from('verification-docs')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Create or update user_documents record
    const { error: upsertError } = await this.supabase
      .from('user_documents')
      .upsert(
        {
          user_id: user.id,
          kind: docType,
          storage_path: filePath,
          status: 'pending',
        },
        { onConflict: 'user_id,kind' }
      );

    // SECURITY FIX #2: Rollback - eliminar archivo si el registro en DB falla
    if (upsertError) {
      console.error('Error creating document record, rolling back file upload:', upsertError);

      // Intentar eliminar el archivo subido para mantener consistencia
      try {
        await this.supabase.storage
          .from('verification-docs')
          .remove([filePath]);
        this.logger.debug('Rollback successful: file removed from storage');
      } catch (rollbackError) {
        // Log pero no fallar - el archivo huérfano se puede limpiar después
        console.error('Rollback failed: could not remove uploaded file:', rollbackError);
      }

      throw new Error(
        'Error al registrar documento. El archivo fue eliminado. Por favor, intenta de nuevo.'
      );
    }

    return filePath;
  }

  /**
   * Carga el estado de verificación del usuario (driver/owner) y actualiza la señal reactiva.
   */
  async loadStatuses(): Promise<UserVerificationStatus[]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) {
      this.statuses.set([]);
      return [];
    }

    this.loadingStatuses.set(true);

    try {
      const { data, error } = await this.supabase
        .from('user_verifications')
        .select('user_id, role, status, missing_docs, notes, metadata, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const normalized: UserVerificationStatus[] = (data ?? []).map((row: UserVerificationRow) => ({
        user_id: row.user_id,
        role: (row.role ?? 'driver') as VerificationRole,
        status: (row.status ?? 'PENDIENTE') as UserVerificationStatus['status'],
        missing_docs: Array.isArray(row.missing_docs)
          ? (row.missing_docs as string[])
          : row.missing_docs
            ? (Object.values(row.missing_docs) as string[])
            : [],
        notes: row.notes ?? null,
        metadata: (row.metadata ?? null) as Record<string, unknown> | null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      this.statuses.set(normalized);
      return normalized;
    } finally {
      this.loadingStatuses.set(false);
    }
  }

  /**
   * Obtiene los documentos subidos por el usuario y los expone vía señal reactiva.
   */
  async loadDocuments(): Promise<UserDocument[]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) {
      this.documents.set([]);
      return [];
    }

    this.loadingDocuments.set(true);

    try {
      const { data, error } = await this.supabase
        .from('user_documents')
        .select(
          'id, user_id, kind, storage_path, status, notes, reviewed_at, reviewed_by, created_at, analyzed_at',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalized: UserDocument[] = (data ?? []).map((row: UserDocumentRow) => ({
        id: String(row.id),
        user_id: row.user_id,
        kind: row.kind,
        storage_path: row.storage_path,
        status: row.status,
        notes: row.notes ?? null,
        created_at: row.created_at,
        reviewed_by: row.reviewed_by ?? null,
        reviewed_at: row.reviewed_at ?? null,
        analyzed_at: (row as UserDocumentRow & { analyzed_at?: string | null }).analyzed_at ?? null,
      }));

      this.documents.set(normalized);
      return normalized;
    } finally {
      this.loadingDocuments.set(false);
    }
  }

  /**
   * Dispara la verificación automática (edge function) y refresca estado/documentos.
   */
  async triggerVerification(role?: VerificationRole): Promise<void> {
    const body = role ? { role } : {};

    const { error } = await this.supabase.functions.invoke('verify-user-docs', { body });

    if (error) {
      throw error;
    }

    await Promise.all([this.loadStatuses(), this.loadDocuments()]);
  }

  /**
   * Registra el intento de verificación en la tabla
   */
  async submitVerification(role: 'driver' | 'owner' = 'driver'): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { error } = await this.supabase.from('user_verifications').upsert({
      user_id: user.id,
      role,
      status: 'PENDIENTE',
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  }

  /**
   * Obtiene el estado actual
   */
  async getStatus(role: 'driver' | 'owner' = 'driver'): Promise<VerificationStatus | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('user_verifications')
      .select('status, missing_docs, notes')
      .eq('user_id', user.id)
      .eq('role', role)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignorar "no encontrado"

    return data as VerificationStatus;
  }

  /**
   * Obtiene la lista de tipos de documento válidos.
   * Útil para UI que necesita mostrar opciones disponibles.
   */
  getValidDocTypes(): readonly string[] {
    return VALID_DOC_TYPES;
  }

  /**
   * Verifica si un tipo de documento es válido.
   */
  isValidDocType(docType: string): boolean {
    return VALID_DOC_TYPES.includes(docType as ValidDocType);
  }
}
