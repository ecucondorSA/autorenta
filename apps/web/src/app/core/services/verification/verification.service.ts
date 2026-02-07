import { Injectable, inject, signal, OnDestroy, effect } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { UserDocument, UserVerificationStatus, VerificationRole } from '@core/models';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { FileUploadService } from '@core/services/infrastructure/file-upload.service';
import { AuthService } from '@core/services/auth/auth.service';
import type { Database } from '@core/types/database.types';
import { DEFAULT_IMAGE_MIME_TYPES, validateFile } from '@core/utils/file-validation.util';

export interface DetailedVerificationStatus {
  status: 'PENDIENTE' | 'VERIFICADO' | 'RECHAZADO';
  missing_docs: string[]; // IDs de documentos faltantes (ej: 'license_front', 'license_back')
  notes?: string;
}

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
  'criminal_record',
] as const;

type ValidDocType = (typeof VALID_DOC_TYPES)[number];

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB (mobile-friendly)
const IDENTITY_BUCKETS = ['identity-documents', 'documents'] as const;

/**
 * Valida que el tipo de documento sea uno de los permitidos.
 * @throws Error si el tipo no es válido
 */
function validateDocType(docType: string): asserts docType is ValidDocType {
  if (!VALID_DOC_TYPES.includes(docType as ValidDocType)) {
    throw new Error(
      `Tipo de documento inválido: "${docType}". ` + `Tipos válidos: ${VALID_DOC_TYPES.join(', ')}`,
    );
  }
}

@Injectable({
  providedIn: 'root',
})
export class VerificationService implements OnDestroy {
  private readonly logger = inject(LoggerService);
  private supabase = injectSupabase();
  private readonly authService = inject(AuthService);
  private readonly fileUploadService = inject(FileUploadService);

  // Realtime channels
  private verificationsChannel: RealtimeChannel | null = null;
  private documentsChannel: RealtimeChannel | null = null;
  private currentUserId: string | null = null;

  // Reactive state consumed by guards/widgets/pages
  readonly statuses = signal<UserVerificationStatus[]>([]);
  readonly documents = signal<UserDocument[]>([]);
  readonly loadingStatuses = signal(false);
  readonly loadingDocuments = signal(false);

  constructor() {
    // Auto-subscribe to realtime when user is authenticated
    effect(() => {
      const isAuthenticated = this.authService.isAuthenticated();
      if (isAuthenticated) {
        void this.setupRealtimeSubscriptions();
      } else {
        this.unsubscribeRealtime();
        this.statuses.set([]);
        this.documents.set([]);
      }
    });
  }

  ngOnDestroy(): void {
    this.unsubscribeRealtime();
  }

  /**
   * Setup realtime subscriptions for verification status and documents
   */
  private async setupRealtimeSubscriptions(): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    // Avoid duplicate subscriptions
    if (this.currentUserId === user.id && this.verificationsChannel) {
      return;
    }

    this.unsubscribeRealtime();
    this.currentUserId = user.id;

    this.logger.debug('[VerificationService] Setting up realtime subscriptions for user:', user.id);

    // Subscribe to user_verifications changes
    this.verificationsChannel = this.supabase
      .channel(`verifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_verifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          this.logger.debug('[VerificationService] Verification status changed via realtime');
          void this.loadStatuses();
        },
      )
      .subscribe();

    // Subscribe to user_documents changes
    this.documentsChannel = this.supabase
      .channel(`documents:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_documents',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          this.logger.debug('[VerificationService] User documents changed via realtime');
          void this.loadDocuments();
        },
      )
      .subscribe();
  }

  /**
   * Unsubscribe from realtime channels
   */
  private unsubscribeRealtime(): void {
    if (this.verificationsChannel) {
      this.supabase.removeChannel(this.verificationsChannel);
      this.verificationsChannel = null;
    }
    if (this.documentsChannel) {
      this.supabase.removeChannel(this.documentsChannel);
      this.documentsChannel = null;
    }
    this.currentUserId = null;
  }

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
  async uploadDocument(file: File, docType: string): Promise<string> {
    // SECURITY FIX #1: Validar docType contra whitelist antes de usar
    validateDocType(docType);

    const validation = validateFile(file, {
      maxSizeBytes: MAX_UPLOAD_BYTES,
      allowedMimeTypes: DEFAULT_IMAGE_MIME_TYPES,
    });

    if (!validation.valid) {
      throw new Error(validation.error || 'Archivo no válido');
    }

    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${docType}_${Date.now()}.${fileExt}`;

    // Upload to identity bucket with fallback for legacy environments
    const { bucket } = await this.uploadToIdentityBucket(filePath, file);

    // Create or update user_documents record using RPC
    // (workaround: PostgREST no expone la tabla directamente)
    const { error: upsertError } = await this.supabase.rpc('upsert_user_document', {
      p_user_id: user.id,
      p_kind: docType,
      p_storage_path: filePath,
      p_status: 'pending',
    });

    // SECURITY FIX #2: Rollback - eliminar archivo si el registro en DB falla
    if (upsertError) {
      this.logger.error('Error creating document record, rolling back file upload:', upsertError);

      // Intentar eliminar el archivo subido para mantener consistencia
      try {
        await this.supabase.storage.from(bucket).remove([filePath]);
        this.logger.debug('Rollback successful: file removed from storage');
      } catch (rollbackError) {
        // Log pero no fallar - el archivo huérfano se puede limpiar después
        this.logger.error('Rollback failed: could not remove uploaded file:', rollbackError);
      }

      throw new Error(
        'Error al registrar documento. El archivo fue eliminado. Por favor, intenta de nuevo.',
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalized: UserVerificationStatus[] = (data ?? []).map((row: any) => ({
        user_id: row.user_id as string,
        role: (row.role ?? 'driver') as VerificationRole,
        status: (row.status ?? 'PENDIENTE') as UserVerificationStatus['status'],
        missing_docs: Array.isArray(row.missing_docs)
          ? (row.missing_docs as string[])
          : row.missing_docs
            ? (Object.values(row.missing_docs) as string[])
            : [],
        notes: row.notes ?? undefined,
        metadata: (row.metadata ?? undefined) as Record<string, unknown> | undefined,
        created_at: row.created_at ?? undefined,
        updated_at: row.updated_at ?? undefined,
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
      // Usar RPC ya que PostgREST no expone la tabla directamente
      const { data, error } = await this.supabase.rpc('get_user_documents', { p_user_id: user.id });

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
      { maxAttempts: 3, baseDelayMs: 200, operationName: 'triggerVerification' },
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
    } = {},
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
        this.logger.warn(
          `${operationName} attempt ${attempt} failed, retrying in ${delayMs}ms`,
          error,
        );
        await this.sleep(delayMs);
      }
    }

    return null;
  }

  /**
   * Espera un tiempo determinado.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Uploads to identity bucket with fallback to legacy bucket.
   */
  private async uploadToIdentityBucket(
    filePath: string,
    file: File,
  ): Promise<{ bucket: (typeof IDENTITY_BUCKETS)[number]; path: string }> {
    let lastError: unknown;

    for (const bucket of IDENTITY_BUCKETS) {
      const { error } = await this.supabase.storage.from(bucket).upload(filePath, file);
      if (!error) {
        if (bucket !== IDENTITY_BUCKETS[0]) {
          this.logger.warn(`[VerificationService] Falling back to bucket ${bucket}`);
        }
        return { bucket, path: filePath };
      }

      lastError = error;

      // Only fallback when bucket is missing
      if (!this.isMissingBucketError(error)) {
        break;
      }
    }

    throw lastError ?? new Error('Error al subir el documento');
  }

  private isMissingBucketError(error: unknown): boolean {
    const err = error as { message?: string; status?: number; error?: string };
    const message = `${err?.message ?? ''} ${err?.error ?? ''}`.toLowerCase();
    return (message.includes('bucket') && message.includes('not found')) || err?.status === 404;
  }

  /**
   * Verifica un documento usando OCR (Google Cloud Vision).
   * Llama a la edge function verify-document para procesar la imagen.
   *
   * @param imageBase64 - Imagen en base64 (sin prefijo data:...)
   * @param documentType - 'dni' o 'license'
   * @param side - 'front' o 'back'
   * @param country - Código de país (ej: 'AR', 'EC', 'US', etc.)
   * @returns Resultado de la verificación OCR
   */
  async verifyDocumentOcr(
    imageBase64: string,
    documentType: 'dni' | 'license',
    side: 'front' | 'back',
    country: string,
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

        if (error) {
          this.logger.error('[VerifyDocument] Edge Function Error:', error);

          // Read response body if available
          if (error instanceof Error && 'context' in error) {
            const context = (error as { context: unknown }).context;
            this.logger.error('[VerifyDocument] Error Context:', context);

            if (context instanceof Response && !context.bodyUsed) {
              try {
                const responseText = await context.clone().text();
                this.logger.error('[VerifyDocument] Response Body:', responseText);
                try {
                  const jsonBody = JSON.parse(responseText);
                  this.logger.error('[VerifyDocument] Parsed Error:', jsonBody);
                } catch {
                  // Not JSON, already logged as text
                }
              } catch (error: unknown) {
                this.logger.error('[VerifyDocument] Could not read response body:', error);
              }
            }
          }
          throw error;
        }
        return data;
      },
      { maxAttempts: 3, baseDelayMs: 200, operationName: 'verifyDocumentOcr' },
    );

    if (!result) {
      this.logger.info('verifyDocumentOcr failed after retries', {
        documentType,
        side,
        country,
        imageSize: imageBase64.length,
      });
      throw new Error(
        'Verificación OCR fallida después de múltiples intentos. ' +
        'Por favor, asegurate de que la imagen sea clara y esté bien iluminada.'
      );
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
    country: string,
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
    const validation = validateFile(file, {
      maxSizeBytes: MAX_UPLOAD_BYTES,
      allowedMimeTypes: DEFAULT_IMAGE_MIME_TYPES,
    });

    if (!validation.valid) {
      throw new Error(validation.error || 'Archivo no válido');
    }

    // 2. Compress image using FileUploadService
    let processedFile = file;
    try {
      processedFile = await this.fileUploadService.compressImage(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
      });
      this.logger.info(`Document compressed: ${(file.size / 1024).toFixed(0)}KB -> ${(processedFile.size / 1024).toFixed(0)}KB`);
    } catch (error: unknown) {
      this.logger.warn('Compression failed, proceeding with original', error);
    }

    // Determinar tipo de documento y lado
    const documentType = docType.includes('license') ? 'license' : 'dni';
    const side = docType.includes('back') ? 'back' : 'front';

    // 1. Convertir archivo a base64 para OCR (antes de subir para mejor UX)
    const base64 = await this.fileToBase64(processedFile);

    // 2. Subir al storage (persistir primero para que verify-document pueda actualizar user_documents)
    const storagePath = await this.uploadDocument(processedFile, docType);

    // 3. Llamar a verify-document para OCR con base64
    let ocrResult = null;

    // Only run OCR for supported countries to avoid backend errors
    if (['AR', 'EC'].includes(country)) {
      try {
        ocrResult = await this.verifyDocumentOcr(base64, documentType, side, country);

        this.logger.info('Document OCR verification completed', {
          docType,
          success: ocrResult.success,
          confidence: ocrResult.ocr_confidence,
        });
      } catch (ocrError) {
        this.logger.warn('OCR verification failed, document still uploading', ocrError);
      }
    } else {
      this.logger.info(`Skipping OCR for unsupported country: ${country}`);
    }

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
