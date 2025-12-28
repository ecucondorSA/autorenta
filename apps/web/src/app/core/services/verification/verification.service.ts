import { Injectable, inject, signal } from '@angular/core';
import type { UserDocument, UserVerificationStatus, VerificationRole } from '@core/models';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import type { Database } from '@core/types/database.types';

export interface DetailedVerificationStatus {
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
  'driver_license_back',
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
  private supabase = injectSupabase();

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
   *
   * Implementa exponential backoff: 200ms → 400ms → 800ms (max 3 reintentos).
   */
  async triggerVerification(role?: VerificationRole): Promise<void> {
    const body = role ? { role } : {};

    const result = await this.retryWithBackoff(
      async () => {
        const { error } = await this.supabase.functions.invoke('verify-user-docs', { body });
        if (error) throw error;
        return true;
      },
      { maxAttempts: 3, baseDelayMs: 200, operationName: 'triggerVerification' }
    );

    if (!result) {
      throw new Error('Verificación fallida después de múltiples intentos');
    }

    await Promise.all([this.loadStatuses(), this.loadDocuments()]);
  }

  /**
   * Ejecuta una operación con exponential backoff.
   *
   * @param operation - Función async a ejecutar
   * @param options - Configuración del retry
   * @returns Resultado de la operación o null si falla
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      baseDelayMs?: number;
      operationName?: string;
    } = {}
  ): Promise<T | null> {
    const { maxAttempts = 3, baseDelayMs = 200, operationName = 'operation' } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts;

        if (isLastAttempt) {
          this.logger.error(`${operationName} failed after ${maxAttempts} attempts`, error);
          return null;
        }

        // Exponential backoff: 200 → 400 → 800ms
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        this.logger.warn(`${operationName} attempt ${attempt} failed, retrying in ${delayMs}ms`, error);
        await this.sleep(delayMs);
      }
    }

    return null;
  }

  /**
   * Espera un tiempo determinado.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verifica un documento usando OCR (Google Cloud Vision).
   * Llama a la edge function verify-document para procesar la imagen.
   *
   * @param imageBase64 - Imagen en base64 (sin prefijo data:...)
   * @param documentType - 'dni' o 'license'
   * @param side - 'front' o 'back'
   * @param country - 'AR' (Argentina) o 'EC' (Ecuador)
   * @returns Resultado de la verificación OCR
   */
  async verifyDocumentOcr(
    imageBase64: string,
    documentType: 'dni' | 'license',
    side: 'front' | 'back',
    country: 'AR' | 'EC'
  ): Promise<{
    success: boolean;
    ocr_confidence: number;
    validation: {
      isValid: boolean;
      confidence: number;
      extracted: Record<string, unknown>;
      errors: string[];
      warnings: string[];
    };
    extracted_data: Record<string, unknown>;
    errors: string[];
    warnings: string[];
  }> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const result = await this.retryWithBackoff(
      async () => {
        const { data, error } = await this.supabase.functions.invoke('verify-document', {
          body: {
            image_base64: imageBase64,
            document_type: documentType,
            side,
            country,
            user_id: user.id,
          },
        });

        if (error) throw error;
        return data;
      },
      { maxAttempts: 3, baseDelayMs: 200, operationName: 'verifyDocumentOcr' }
    );

    if (!result) {
      this.logger.error('verifyDocumentOcr failed after retries');
      throw new Error('Verificación OCR fallida después de múltiples intentos');
    }

    return result;
  }

  /**
   * Sube un documento y lo verifica con OCR en un solo paso.
   * Combina uploadDocument() + verifyDocumentOcr() para mejor UX.
   *
   * @param file - Archivo de imagen
   * @param docType - Tipo de documento (gov_id_front, license_front, etc.)
   * @param country - País del documento
   * @returns Resultado de la verificación OCR
   */
  async uploadAndVerifyDocument(
    file: File,
    docType: string,
    country: 'AR' | 'EC'
  ): Promise<{
    storagePath: string;
    ocrResult: {
      success: boolean;
      ocr_confidence: number;
      validation: {
        isValid: boolean;
        confidence: number;
        extracted: Record<string, unknown>;
        errors: string[];
        warnings: string[];
      };
      extracted_data: Record<string, unknown>;
      errors: string[];
      warnings: string[];
    } | null;
  }> {
    // Determinar tipo de documento y lado
    const documentType = docType.includes('license') ? 'license' : 'dni';
    const side = docType.includes('back') ? 'back' : 'front';

    // 1. Convertir archivo a base64 para OCR (antes de subir para mejor UX)
    const base64 = await this.fileToBase64(file);

    // 2. Subir al storage (en paralelo con OCR)
    const uploadPromise = this.uploadDocument(file, docType);

    // 3. Llamar a verify-document para OCR con base64
    let ocrResult = null;
    try {
      ocrResult = await this.verifyDocumentOcr(
        base64,
        documentType,
        side,
        country
      );

      this.logger.info('Document OCR verification completed', {
        docType,
        success: ocrResult.success,
        confidence: ocrResult.ocr_confidence,
      });
    } catch (ocrError) {
      this.logger.warn('OCR verification failed, document still uploading', ocrError);
    }

    // 4. Esperar a que termine el upload
    const storagePath = await uploadPromise;

    return { storagePath, ocrResult };
  }

  /**
   * Convierte un File a base64 (sin prefijo data:...)
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remover prefijo "data:image/...;base64,"
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
  async getStatus(role: 'driver' | 'owner' = 'driver'): Promise<DetailedVerificationStatus | null> {
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

    return data as DetailedVerificationStatus;
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
