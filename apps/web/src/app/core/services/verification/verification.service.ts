import { Injectable, inject, signal, OnDestroy, effect } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { UserDocument, UserVerificationStatus, VerificationRole } from '@core/models';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { FileUploadService } from '@core/services/infrastructure/file-upload.service';
import { AuthService } from '@core/services/auth/auth.service';
import type { Database } from '@core/types/database.types';
import { DEFAULT_IMAGE_MIME_TYPES, validateFile } from '@core/utils/file-validation.util';
import { environment } from '@environment';

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

const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024; // 15MB pre-compression (mobile cameras produce 3-8MB)
const MAX_COMPRESSED_BYTES = 2 * 1024 * 1024; // 2MB post-compression target
const IDENTITY_BUCKETS = ['identity-documents', 'documents'] as const;
const ACCESS_TOKEN_MIN_TTL_SECONDS = 30;
const ACCESS_TOKEN_MAX_AGE_SECONDS = 5 * 60;
const OCR_TRACE_HEADER = 'x-kyc-trace-id';
const OCR_FAILURE_COOLDOWN_MS = 12_000;
const AUTH_ERROR_CODES = new Set(['401', 'AUTH_INVALID', 'AUTH_REQUIRED', 'INVALID_JWT']);
const TECHNICAL_AUTH_HINTS = ['invalid jwt', 'jwt expired', 'jwt malformed', 'auth session missing'];
const CORS_FALLBACK_HINTS = [
  'access-control-allow-headers',
  'request header field',
  'cors',
  'failed to fetch',
  'network request failed',
  'networkerror',
];

interface EdgeFunctionErrorInfo {
  status: number | null;
  code: string | null;
  message: string | null;
}

interface AccessTokenPayload {
  exp: number | null;
  iat: number | null;
  iss: string | null;
}

interface VerifyDocumentRequestBody {
  image_base64: string;
  document_type: 'dni' | 'license';
  side: 'front' | 'back';
  country: string;
}

interface VerifyDocumentOcrResult {
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
}

class EdgeFunctionUserError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: string | null,
  ) {
    super(message);
    this.name = 'EdgeFunctionUserError';
  }
}

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

  /** In-flight deduplication for loadDocuments() */
  private documentsRequest: Promise<UserDocument[]> | null = null;
  private readonly ocrFailureCooldownByKey = new Map<string, number>();

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
    const userId = await this.authService.getCachedUserId();
    if (!userId) return;

    // Avoid duplicate subscriptions
    if (this.currentUserId === userId && this.verificationsChannel) {
      return;
    }

    this.unsubscribeRealtime();
    this.currentUserId = userId;

    this.logger.debug('[VerificationService] Setting up realtime subscriptions for user:', userId);

    // Subscribe to user_verifications changes
    this.verificationsChannel = this.supabase
      .channel(`verifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_verifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          this.logger.debug('[VerificationService] Verification status changed via realtime');
          void this.loadStatuses();
        },
      )
      .subscribe();

    // Subscribe to user_documents changes
    this.documentsChannel = this.supabase
      .channel(`documents:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_documents',
          filter: `user_id=eq.${userId}`,
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
      maxSizeBytes: MAX_COMPRESSED_BYTES,
      allowedMimeTypes: DEFAULT_IMAGE_MIME_TYPES,
    });

    if (!validation.valid) {
      throw new Error(validation.error || 'Archivo no válido');
    }

    const userId = await this.authService.getCachedUserId();
    if (!userId) throw new Error('No autenticado');

    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${docType}_${Date.now()}.${fileExt}`;

    // Upload to identity bucket with fallback for legacy environments
    const { bucket } = await this.uploadToIdentityBucket(filePath, file);

    // Create or update user_documents record using RPC
    // (workaround: PostgREST no expone la tabla directamente)
    const { error: upsertError } = await this.supabase.rpc('upsert_user_document', {
      p_user_id: userId,
      p_kind: docType,
      p_storage_path: filePath,
      p_status: 'pending',
    });

    // SECURITY FIX #2: Rollback - eliminar archivo si el registro en DB falla
    if (upsertError) {
      this.logger.error('uploadDocument: failed to create document record, rolling back file upload', upsertError);

      // Intentar eliminar el archivo subido para mantener consistencia
      try {
        await this.supabase.storage.from(bucket).remove([filePath]);
        this.logger.debug('Rollback successful: file removed from storage');
      } catch (rollbackError) {
        // Log pero no fallar - el archivo huérfano se puede limpiar después
        this.logger.warn('uploadDocument: rollback failed, uploaded file could not be removed', rollbackError);
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
    const userId = await this.authService.getCachedUserId();
    if (!userId) {
      this.statuses.set([]);
      return [];
    }

    this.loadingStatuses.set(true);

    try {
      const { data, error } = await this.supabase
        .from('user_verifications')
        .select('user_id, role, status, missing_docs, notes, metadata, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const normalized: UserVerificationStatus[] = (data ?? []).map((row) => ({
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
    // Deduplicate concurrent calls — return the same in-flight promise
    if (this.documentsRequest) {
      return this.documentsRequest;
    }

    this.documentsRequest = this.fetchDocuments();

    try {
      return await this.documentsRequest;
    } finally {
      this.documentsRequest = null;
    }
  }

  private async fetchDocuments(): Promise<UserDocument[]> {
    const userId = await this.authService.getCachedUserId();
    if (!userId) {
      this.documents.set([]);
      return [];
    }

    this.loadingDocuments.set(true);

    try {
      // Usar RPC ya que PostgREST no expone la tabla directamente
      const { data, error } = await this.supabase.rpc('get_user_documents', { p_user_id: userId });

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
   * Ejecuta una operación con exponential backoff inteligente.
   *
   * Clasifica errores antes de reintentar:
   * - 401 → refresca sesión una vez, luego reintenta
   * - 4xx (excepto 429) → aborta inmediatamente (error determinístico)
   * - 429/5xx/network → reintenta con backoff exponencial
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
      throwLastError?: boolean;
    } = {},
  ): Promise<T | null> {
    const {
      maxAttempts = 3,
      baseDelayMs = 200,
      operationName = 'operation',
      throwLastError = false,
    } = options;
    let tokenRefreshed = false;
    let attempt = 0;
    let lastError: unknown = null;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const statusCode = this.extractHttpStatus(error);
        const action = this.classifyRetryAction(statusCode);

        // 401: intentar refresh de sesión una sola vez
        if (action === 'refresh_and_retry' && !tokenRefreshed) {
          this.logger.info(`${operationName}: HTTP ${statusCode} (Invalid JWT), refreshing session`);
          const refreshedSession = await this.authService.refreshSession();
          if (!refreshedSession) {
            this.logger.info(`${operationName}: session refresh failed, aborting`);
            const sessionError = new EdgeFunctionUserError(
              'Tu sesión expiró. Vuelve a iniciar sesión e intenta nuevamente.',
              401,
              'AUTH_INVALID',
            );
            if (throwLastError) {
              throw sessionError;
            }
            return null;
          }
          tokenRefreshed = true;
          attempt--; // No contar el fallo de auth como intento real
          this.logger.info(`${operationName}: Session refreshed, retrying`);
          continue;
        }

        // Error no-retryable (4xx o 401 después de refresh fallido)
        if (action === 'abort' || (action === 'refresh_and_retry' && tokenRefreshed)) {
          const message = `${operationName}: Non-retryable error (HTTP ${statusCode ?? 'unknown'})`;
          if (statusCode !== null && statusCode < 500) {
            this.logger.info(message, error);
          } else {
            this.logger.error(message, error);
          }
          if (throwLastError) {
            throw error;
          }
          return null;
        }

        // Último intento agotado
        if (attempt >= maxAttempts) {
          this.logger.error(`${operationName} failed after ${maxAttempts} attempts`, error);
          if (throwLastError && lastError) {
            throw lastError;
          }
          return null;
        }

        // Backoff exponencial para errores transitorios (5xx, 429, network)
        const backoffMs = baseDelayMs * Math.pow(2, attempt - 1);
        const jitterMs = Math.floor(Math.random() * Math.max(50, Math.floor(baseDelayMs / 2)));
        const delayMs = backoffMs + jitterMs;
        this.logger.warn(
          `${operationName} attempt ${attempt}/${maxAttempts} failed (HTTP ${statusCode ?? 'network'}), retrying in ${delayMs}ms`,
          error,
        );
        await this.sleep(delayMs);
      }
    }

    if (throwLastError && lastError) {
      throw lastError;
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
   * Clasifica qué acción tomar según el código HTTP del error.
   *
   * - 'retry': error transitorio, reintentar con backoff (5xx, 429, network)
   * - 'refresh_and_retry': token expirado, refrescar sesión y reintentar (401)
   * - 'abort': error determinístico, no reintentar (403, 404, otros 4xx)
   *
   * @param statusCode - Código HTTP extraído del error, o null para errores de red
   * @returns Acción a ejecutar en el retry loop
   */
  private classifyRetryAction(statusCode: number | null): 'retry' | 'refresh_and_retry' | 'abort' {
    if (statusCode === null) return 'retry';              // Red caída, transitorio
    if (statusCode === 401) return 'refresh_and_retry';   // JWT expirado → refrescar sesión
    if (statusCode === 429) return 'retry';               // Rate limit → esperar y reintentar
    if (statusCode >= 500) return 'retry';                // Error del servidor, transitorio
    return 'abort';                                       // 4xx restantes: determinísticos
  }

  /**
   * Extrae el código HTTP de un error de Supabase Edge Function.
   *
   * Supabase FunctionsHttpError tiene `context: Response` con el status HTTP.
   * Para errores de red (FunctionsFetchError) retorna null.
   */
  private extractHttpStatus(error: unknown): number | null {
    if (error && typeof error === 'object') {
      const err = error as { context?: unknown; status?: number };
      // FunctionsHttpError: la Response original está en .context
      if (err.context instanceof Response) {
        return err.context.status;
      }
      // Fallback: errores con .status directo
      if (typeof err.status === 'number') {
        return err.status;
      }
    }
    return null;
  }

  private async extractEdgeFunctionErrorInfo(error: unknown): Promise<EdgeFunctionErrorInfo> {
    const status = this.extractHttpStatus(error);
    let code: string | null = null;
    let message: string | null = null;

    if (error && typeof error === 'object') {
      const err = error as { context?: unknown; code?: unknown; message?: unknown };

      if (typeof err.code === 'string') {
        code = err.code;
      } else if (typeof err.code === 'number' && Number.isFinite(err.code)) {
        code = String(err.code);
      }

      if (typeof err.message === 'string' && err.message.trim().length > 0) {
        message = err.message;
      }

      if (err.context instanceof Response) {
        try {
          const responseText = await err.context.clone().text();
          if (responseText) {
            const parsed = JSON.parse(responseText) as Record<string, unknown>;

            const parsedCode = parsed['error'] ?? parsed['code'];
            if (typeof parsedCode === 'string') {
              code = parsedCode;
            } else if (typeof parsedCode === 'number' && Number.isFinite(parsedCode)) {
              code = String(parsedCode);
            }

            const parsedMessage = parsed['message'];
            if (typeof parsedMessage === 'string' && parsedMessage.trim().length > 0) {
              message = parsedMessage;
            }
          }
        } catch {
          // Ignore invalid/non-JSON response bodies.
        }
      }
    }

    return { status, code, message };
  }

  private getOcrUserMessage(info: EdgeFunctionErrorInfo): string {
    if (this.isAuthErrorInfo(info)) {
      return 'Tu sesión expiró. Vuelve a iniciar sesión e intenta nuevamente.';
    }

    if (info.status === 403 || info.code === 'FORBIDDEN') {
      return 'Tu sesión no tiene permisos para esta operación. Cierra sesión, vuelve a ingresar e intenta nuevamente.';
    }

    if (info.status === 404) {
      return 'El servicio de verificación no está disponible en este entorno. Intenta nuevamente en unos minutos.';
    }

    if (info.code === 'OCR_PROVIDER_UNAVAILABLE' || info.status === 503) {
      return 'El servicio de verificación está temporalmente no disponible. Intenta de nuevo en unos minutos.';
    }

    if (info.code === 'OCR_REQUEST_INVALID') {
      return 'No pudimos procesar la foto. Usa JPG o PNG, evita capturas de pantalla y sube la imagen completa del documento.';
    }

    if (info.code === 'OCR_NO_TEXT') {
      return 'No se detectó texto legible en la imagen. Intenta con mejor luz y enfoque.';
    }

    if (info.code === 'OCR_FAILED') {
      return 'No pudimos validar esa foto. Reintenta con: documento completo, buena luz natural, sin reflejos y texto bien enfocado.';
    }

    if (info.message && !this.isTechnicalAuthMessage(info.message)) {
      return info.message;
    }

    return 'No pudimos verificar tu documento en este momento. Por favor, intenta de nuevo en unos segundos.';
  }

  private isAuthErrorInfo(info: EdgeFunctionErrorInfo): boolean {
    if (info.status === 401) return true;
    if (this.isAuthErrorCode(info.code)) return true;
    if (info.message && this.isTechnicalAuthMessage(info.message)) return true;
    return false;
  }

  private isAuthErrorCode(code: string | null): boolean {
    if (!code) return false;
    return AUTH_ERROR_CODES.has(code.toUpperCase());
  }

  private isTechnicalAuthMessage(message: string): boolean {
    const normalized = message.toLowerCase();
    return TECHNICAL_AUTH_HINTS.some((hint) => normalized.includes(hint));
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
  ): Promise<VerifyDocumentOcrResult> {
    const userId = await this.authService.getCachedUserId();
    if (!userId) throw new Error('No autenticado');
    const cooldownKey = this.buildOcrCooldownKey(userId, documentType, side, country, imageBase64);

    if (this.isOcrInCooldown(cooldownKey)) {
      throw new EdgeFunctionUserError(
        'Estamos procesando tu último intento. Espera unos segundos antes de reintentar.',
        429,
        'OCR_COOLDOWN',
      );
    }

    const result = await this.retryWithBackoff(
      async () => {
        const headers = await this.buildVerifyDocumentHeaders();
        const requestBody: VerifyDocumentRequestBody = {
          image_base64: imageBase64,
          document_type: documentType,
          side,
          country,
        };
        const { data, error } = await this.invokeVerifyDocumentWithCorsFallback(requestBody, headers);

        if (error) {
          const info = await this.extractEdgeFunctionErrorInfo(error);
          const logMessage = 'verifyDocumentOcr: Edge Function Error';
          const logPayload = {
            status: info.status,
            code: info.code,
            message: info.message,
          };

          if (info.status !== null && info.status < 500) {
            this.logger.info(logMessage, logPayload);
          } else {
            this.logger.error(logMessage, logPayload);
          }

          if (this.shouldStartOcrCooldown(info)) {
            this.markOcrCooldown(cooldownKey);
          }
          throw new EdgeFunctionUserError(this.getOcrUserMessage(info), info.status, info.code);
        }
        return data;
      },
      {
        maxAttempts: 3,
        baseDelayMs: 200,
        operationName: 'verifyDocumentOcr',
        throwLastError: true,
      },
    );

    if (!result) {
      this.logger.info('verifyDocumentOcr failed after retries', {
        documentType,
        side,
        country,
        imageSize: imageBase64.length,
      });
      throw new Error(
        'No pudimos verificar tu documento en este momento. Por favor, intenta de nuevo en unos segundos.',
      );
    }

    this.clearOcrCooldown(cooldownKey);
    return result;
  }

  private buildOcrCooldownKey(
    userId: string,
    documentType: 'dni' | 'license',
    side: 'front' | 'back',
    country: string,
    imageBase64: string,
  ): string {
    const fingerprint = `${imageBase64.length}:${imageBase64.slice(0, 64)}`;
    return `${userId}:${documentType}:${side}:${country}:${fingerprint}`;
  }

  private isOcrInCooldown(key: string): boolean {
    const expiresAt = this.ocrFailureCooldownByKey.get(key);
    if (!expiresAt) return false;

    if (Date.now() >= expiresAt) {
      this.ocrFailureCooldownByKey.delete(key);
      return false;
    }

    return true;
  }

  private markOcrCooldown(key: string): void {
    this.ocrFailureCooldownByKey.set(key, Date.now() + OCR_FAILURE_COOLDOWN_MS);
  }

  private clearOcrCooldown(key: string): void {
    this.ocrFailureCooldownByKey.delete(key);
  }

  private shouldStartOcrCooldown(info: EdgeFunctionErrorInfo): boolean {
    if (info.status !== 400) return false;

    return (
      info.code === 'OCR_FAILED' || info.code === 'OCR_REQUEST_INVALID' || info.code === 'OCR_NO_TEXT'
    );
  }

  private async invokeVerifyDocumentWithCorsFallback(
    requestBody: VerifyDocumentRequestBody,
    headers: Record<string, string>,
  ): Promise<{ data: VerifyDocumentOcrResult | null; error: unknown | null }> {
    let response = await this.invokeVerifyDocument(requestBody, headers);
    if (!response.error) {
      return response;
    }

    const info = await this.extractEdgeFunctionErrorInfo(response.error);
    if (!this.shouldRetryWithoutTraceHeader(response.error, info, headers)) {
      return response;
    }

    const fallbackHeaders = { ...headers };
    delete fallbackHeaders[OCR_TRACE_HEADER];

    this.logger.warn(
      'verifyDocumentOcr: possible CORS/preflight issue with trace header, retrying without it',
      {
        status: info.status,
        code: info.code,
        message: info.message,
      },
    );

    response = await this.invokeVerifyDocument(requestBody, fallbackHeaders);
    if (!response.error) {
      this.logger.info('verifyDocumentOcr: fallback without trace header succeeded');
    }

    return response;
  }

  private async invokeVerifyDocument(
    requestBody: VerifyDocumentRequestBody,
    headers: Record<string, string>,
  ): Promise<{ data: VerifyDocumentOcrResult | null; error: unknown | null }> {
    const { data, error } = await this.supabase.functions.invoke<VerifyDocumentOcrResult>(
      'verify-document',
      {
        body: requestBody,
        headers,
      },
    );

    return {
      data: data ?? null,
      error,
    };
  }

  private shouldRetryWithoutTraceHeader(
    error: unknown,
    info: EdgeFunctionErrorInfo,
    headers: Record<string, string>,
  ): boolean {
    if (!headers[OCR_TRACE_HEADER]) return false;
    if (this.isAuthErrorInfo(info)) return false;

    if (info.status === null || info.status === 403) {
      return true;
    }

    const normalizedMessage = this.getEdgeErrorMessage(error, info.message);
    return CORS_FALLBACK_HINTS.some((hint) => normalizedMessage.includes(hint));
  }

  private getEdgeErrorMessage(error: unknown, parsedMessage: string | null): string {
    const rawMessage =
      error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : '';
    return `${rawMessage} ${parsedMessage ?? ''}`.toLowerCase();
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
    ocrWarning: string | null;
    ocrResult: VerifyDocumentOcrResult | null;
  }> {
    // 1. Validate MIME type and pre-compression size ceiling
    const typeValidation = validateFile(file, {
      maxSizeBytes: MAX_ORIGINAL_BYTES,
      allowedMimeTypes: DEFAULT_IMAGE_MIME_TYPES,
    });

    if (!typeValidation.valid) {
      throw new Error(typeValidation.error || 'Archivo no válido');
    }

    // 2. Compress image BEFORE size validation (mobile cameras produce 3-8MB photos)
    let processedFile = file;
    try {
      processedFile = await this.fileUploadService.compressImage(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
      });
      this.logger.info(
        `Document compressed: ${(file.size / 1024).toFixed(0)}KB -> ${(processedFile.size / 1024).toFixed(0)}KB`,
      );
    } catch (e) {
      this.logger.warn('Compression failed, proceeding with original', e);
    }

    // 3. Validate compressed size
    if (processedFile.size > MAX_COMPRESSED_BYTES) {
      const maxMB = (MAX_COMPRESSED_BYTES / (1024 * 1024)).toFixed(0);
      throw new Error(
        `Imagen demasiado grande incluso después de comprimir (${(processedFile.size / (1024 * 1024)).toFixed(1)}MB). Máximo ${maxMB}MB.`,
      );
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
    let ocrWarning: string | null = null;

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
        ocrWarning =
          ocrError instanceof Error
            ? ocrError.message
            : 'No pudimos verificar el documento automáticamente. Intenta con una foto más clara.';
        const status = this.extractHttpStatus(ocrError);
        const logPayload = { error: ocrError, warning: ocrWarning, status };
        if (status !== null && status < 500) {
          this.logger.info('OCR verification failed, document still uploading', logPayload);
        } else {
          this.logger.warn('OCR verification failed, document still uploading', logPayload);
        }
      }
    } else {
      this.logger.info(`Skipping OCR for unsupported country: ${country}`);
    }

    try {
      await this.triggerVerification();
    } catch (verificationError) {
      this.logger.warn('Post-upload verification refresh failed', {
        docType,
        error: verificationError,
      });
    }

    return { storagePath, ocrWarning, ocrResult };
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
   * Construye headers para verify-document con token de usuario vigente.
   * Si el access token está por expirar, intenta refrescarlo antes del request.
   */
  private async buildVerifyDocumentHeaders(): Promise<Record<string, string>> {
    let session = await this.authService.ensureSession();

    if (!session?.access_token) {
      throw new EdgeFunctionUserError(
        'Tu sesión expiró. Vuelve a iniciar sesión e intenta nuevamente.',
        401,
        'AUTH_INVALID',
      );
    }

    let tokenPayload = this.extractAccessTokenPayload(session.access_token);
    if (this.isTokenIssuerMismatch(tokenPayload.iss)) {
      throw new EdgeFunctionUserError(
        'Tu sesión no coincide con el entorno actual. Cierra sesión, vuelve a ingresar e intenta nuevamente.',
        401,
        'AUTH_ENV_MISMATCH',
      );
    }

    if (this.shouldRefreshAccessToken(session.access_token, tokenPayload)) {
      const refreshedSession = await this.authService.refreshSession();
      if (!refreshedSession?.access_token) {
        throw new EdgeFunctionUserError(
          'Tu sesión expiró. Vuelve a iniciar sesión e intenta nuevamente.',
          401,
          'AUTH_INVALID',
        );
      }
      session = refreshedSession;
      tokenPayload = this.extractAccessTokenPayload(session.access_token);

      if (this.isTokenIssuerMismatch(tokenPayload.iss)) {
        throw new EdgeFunctionUserError(
          'Tu sesión no coincide con el entorno actual. Cierra sesión, vuelve a ingresar e intenta nuevamente.',
          401,
          'AUTH_ENV_MISMATCH',
        );
      }
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
      [OCR_TRACE_HEADER]: this.createOcrTraceId(),
    };
  }

  private shouldRefreshAccessToken(accessToken: string, payload?: AccessTokenPayload): boolean {
    const tokenPayload = payload ?? this.extractAccessTokenPayload(accessToken);

    if (tokenPayload.exp) {
      const ttlMs = tokenPayload.exp * 1000 - Date.now();
      if (ttlMs <= ACCESS_TOKEN_MIN_TTL_SECONDS * 1000) {
        return true;
      }
    }

    if (tokenPayload.iat) {
      const ageMs = Date.now() - tokenPayload.iat * 1000;
      if (ageMs >= ACCESS_TOKEN_MAX_AGE_SECONDS * 1000) {
        return true;
      }
    }

    return false;
  }

  private extractAccessTokenPayload(accessToken: string): AccessTokenPayload {
    const tokenParts = accessToken.split('.');
    if (tokenParts.length < 2) {
      return { exp: null, iat: null, iss: null };
    }

    const payloadRaw = this.decodeBase64Url(tokenParts[1]);
    if (!payloadRaw) {
      return { exp: null, iat: null, iss: null };
    }

    try {
      const payload = JSON.parse(payloadRaw) as { exp?: unknown; iat?: unknown; iss?: unknown };
      return {
        exp: typeof payload.exp === 'number' ? payload.exp : null,
        iat: typeof payload.iat === 'number' ? payload.iat : null,
        iss: typeof payload.iss === 'string' ? payload.iss : null,
      };
    } catch {
      return { exp: null, iat: null, iss: null };
    }
  }

  private isTokenIssuerMismatch(issuer: string | null): boolean {
    if (!issuer) return false;
    const expectedIssuer = this.getExpectedTokenIssuer();
    if (!expectedIssuer) return false;
    return issuer.replace(/\/+$/, '') !== expectedIssuer.replace(/\/+$/, '');
  }

  private getExpectedTokenIssuer(): string | null {
    if (!environment.supabaseUrl) {
      return null;
    }
    return `${environment.supabaseUrl.replace(/\/+$/, '')}/auth/v1`;
  }

  private decodeBase64Url(input: string): string | null {
    if (typeof globalThis.atob !== 'function') {
      return null;
    }

    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));

    try {
      return globalThis.atob(normalized + padding);
    } catch {
      return null;
    }
  }

  private createOcrTraceId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `kyc-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  }

  /**
   * Registra el intento de verificación en la tabla
   */
  async submitVerification(role: 'driver' | 'owner' = 'driver'): Promise<void> {
    const userId = await this.authService.getCachedUserId();
    if (!userId) throw new Error('No autenticado');

    const { error } = await this.supabase.from('user_verifications').upsert({
      user_id: userId,
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
    const userId = await this.authService.getCachedUserId();
    if (!userId) return null;

    const { data, error } = await this.supabase
      .from('user_verifications')
      .select('status, missing_docs, notes')
      .eq('user_id', userId)
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
