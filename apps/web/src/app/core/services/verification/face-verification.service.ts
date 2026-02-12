import { Injectable, inject, signal } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

/**
 * Face Verification Result from Edge Function
 */
export interface FaceVerificationResult {
  success: boolean;
  face_detected: boolean;
  face_match_score: number;
  liveness_score?: number;
  frames_analyzed?: number;
  metadata?: {
    video_duration_seconds?: number;
    face_count?: number;
    liveness_checks?: string[];
  };
  error?: string;
  // KYC blocking info
  is_blocked?: boolean;
  block_reason?: string;
  attempts_remaining?: number;
}

/**
 * KYC Block Status
 */
export interface KycBlockStatus {
  blocked: boolean;
  reason?: string;
  attempts: number;
  lastFailedAt?: string;
  blockedAt?: string;
}

/**
 * Custom error for KYC blocked users
 */
export class KycBlockedError extends Error {
  constructor(
    public readonly reason: string,
    public readonly attempts: number = 0,
  ) {
    super(reason);
    this.name = 'KycBlockedError';
  }
}

const IDENTITY_BUCKETS = ['identity-documents', 'documents'] as const;
type IdentityBucket = (typeof IDENTITY_BUCKETS)[number];

/**
 * Face Verification Status
 */
export interface FaceVerificationStatus {
  isVerified: boolean;
  selfieUrl: string | null;
  verifiedAt: string | null;
  faceMatchScore: number | null;
  livenessScore: number | null;
  requiresLevel2: boolean;
}

/**
 * Video Upload Progress
 */
export interface VideoUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Service for managing face verification via selfie video
 *
 * Handles:
 * - Uploading selfie videos to storage
 * - Processing videos with Cloudflare Worker AI
 * - Face matching against ID document photos
 * - Basic liveness detection (no advanced anti-spoofing)
 * - Verification status tracking
 */
@Injectable({
  providedIn: 'root',
})
export class FaceVerificationService {
  private readonly supabase: SupabaseClient = injectSupabase();
  private readonly logger = inject(LoggerService);
  private readonly identityBuckets = IDENTITY_BUCKETS;

  // Reactive state
  readonly status = signal<FaceVerificationStatus>({
    isVerified: false,
    selfieUrl: null,
    verifiedAt: null,
    faceMatchScore: null,
    livenessScore: null,
    requiresLevel2: true,
  });
  readonly uploadProgress = signal<VideoUploadProgress | null>(null);
  readonly processing = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly kycBlockStatus = signal<KycBlockStatus | null>(null);

  /**
   * Check current face verification status
   */
  async checkFaceVerificationStatus(): Promise<FaceVerificationStatus> {
    this.loading.set(true);
    this['error'].set(null);

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Get identity level data
      const { data, error } = await this.supabase
        .from('user_identity_levels')
        .select('*')
        .eq('user_id', user['id'])
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const statusData: FaceVerificationStatus = {
        isVerified: data?.selfie_verified_at !== null && (data?.face_match_score ?? 0) >= 70,
        selfieUrl: data?.selfie_url ?? null,
        verifiedAt: data?.selfie_verified_at ?? null,
        faceMatchScore: data?.face_match_score ?? null,
        livenessScore: data?.liveness_score ?? null,
        requiresLevel2: (data?.current_level ?? 1) < 2,
      };

      this['status'].set(statusData);
      return statusData;
    } catch (err) {
      const message =
        err instanceof Error ? err['message'] : 'No pudimos verificar el estado de la selfie';
      this['error'].set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Check if user is KYC blocked (face verification)
   * @returns KYC block status with details
   */
  async isUserKycBlocked(): Promise<KycBlockStatus> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { blocked: false, attempts: 0 };
      }

      const { data, error } = await this.supabase.rpc('is_kyc_blocked', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('Error checking KYC block status:', error);
        return { blocked: false, attempts: 0 };
      }

      const result = data?.[0];
      const blockStatus: KycBlockStatus = {
        blocked: result?.blocked ?? false,
        reason: result?.reason ?? undefined,
        attempts: result?.attempts ?? 0,
        lastFailedAt: result?.last_failed_at ?? undefined,
        blockedAt: result?.blocked_at ?? undefined,
      };

      this.kycBlockStatus.set(blockStatus);
      return blockStatus;
    } catch (err) {
      console.error('Error checking KYC block status:', err);
      return { blocked: false, attempts: 0 };
    }
  }

  /**
   * Get remaining verification attempts
   */
  getRemainingAttempts(): number {
    const status = this.kycBlockStatus();
    if (!status) return 5;
    return Math.max(0, 5 - status.attempts);
  }

  /**
   * Upload selfie video to storage
   * @param videoFile Video file (MP4/WebM, max 10MB, 3-10 seconds)
   * @returns Storage path and bucket of uploaded video
   */
  async uploadSelfieVideo(
    videoFile: File,
  ): Promise<{ storagePath: string; bucket: IdentityBucket }> {
    this.loading.set(true);
    this['error'].set(null);

    try {
      // Validate video file
      this.validateVideoFile(videoFile);

      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Check if user has Level 2 complete
      const { data: levelData } = await this.supabase
        .from('user_identity_levels')
        .select('current_level')
        .eq('user_id', user['id'])
        .single();

      if (!levelData || levelData.current_level < 2) {
        throw new Error(
          'Debes completar la verificación de documentos (Level 2) antes de verificar tu identidad con selfie',
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const extension = videoFile.name.split('.').pop() || 'mp4';
      const fileName = `selfie_video_${timestamp}.${extension}`;
      const filePath = `${user['id']}/${fileName}`;

      const { bucket } = await this.uploadToIdentityBucket(filePath, videoFile);

      return { storagePath: filePath, bucket };
    } catch (err) {
      const message = err instanceof Error ? err['message'] : 'No pudimos subir el video';
      this['error'].set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Verify face by comparing selfie video with ID document photo
   * @param videoPath Storage path of uploaded selfie video
   * @param documentUrl URL or storage path of ID document photo (from Level 2)
   * @returns Verification result with face match score
   * @throws KycBlockedError if user is blocked
   */
  async verifyFace(
    videoPath: string,
    documentUrl: string,
    bucketHint?: IdentityBucket,
  ): Promise<FaceVerificationResult> {
    this.processing.set(true);
    this['error'].set(null);

    try {
      // Check if user is KYC blocked FIRST
      const blockStatus = await this.isUserKycBlocked();
      if (blockStatus.blocked) {
        throw new KycBlockedError(
          blockStatus.reason ||
            'Tu cuenta está bloqueada para verificación facial. Contacta a soporte.',
          blockStatus.attempts,
        );
      }

      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Build signed URLs for private bucket access
      const signedVideoUrl = await this.createSignedIdentityUrl(videoPath, bucketHint);
      const signedDocumentUrl = documentUrl.startsWith('http')
        ? documentUrl
        : await this.createSignedIdentityUrl(documentUrl);

      // Call Supabase Edge Function for face verification
      const { data: result, error: invokeError } = await this.supabase.functions.invoke<FaceVerificationResult>(
        'verify-face',
        {
          body: {
            video_url: signedVideoUrl,
            document_url: signedDocumentUrl,
            user_id: user['id'],
          },
        },
      );

      if (invokeError) {
        throw new Error(invokeError.message || 'Error al verificar la identidad facial');
      }

      if (!result) {
        throw new Error('No se recibió respuesta del servicio de verificación facial');
      }

      // Check if user was blocked during this attempt
      if (result.is_blocked) {
        // Refresh block status
        await this.isUserKycBlocked();
        throw new KycBlockedError(
          result.block_reason || 'Tu cuenta ha sido bloqueada. Contacta a soporte.',
          5 - (result.attempts_remaining || 0),
        );
      }

      if (!result.success) {
        // Include remaining attempts in error message
        const attemptsInfo =
          result.attempts_remaining !== undefined
            ? ` (${result.attempts_remaining} intentos restantes)`
            : '';
        throw new Error((result['error'] || 'Verificación facial fallida') + attemptsInfo);
      }

      // Update user_identity_levels with results
      await this.updateIdentityLevelWithResults(user['id'], videoPath, result);

      // Refresh status (including block status)
      await Promise.all([this.checkFaceVerificationStatus(), this.isUserKycBlocked()]);

      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err['message'] : 'No pudimos verificar tu identidad facial';
      this['error'].set(message);
      throw err;
    } finally {
      this.processing.set(false);
    }
  }

  /**
   * Get face match score for current user
   */
  async getFaceMatchScore(): Promise<number | null> {
    try {
      const status = await this.checkFaceVerificationStatus();
      return status.faceMatchScore;
    } catch {
      return null;
    }
  }

  /**
   * Get liveness score for current user
   */
  async getLivenessScore(): Promise<number | null> {
    try {
      const status = await this.checkFaceVerificationStatus();
      return status.livenessScore;
    } catch {
      return null;
    }
  }

  /**
   * Validate video file before upload
   */
  private validateVideoFile(file: File): void {
    // Check file type (Very relaxed - accept any video format)
    const type = file.type.toLowerCase();
    const isValid =
      type.startsWith('video/') ||
      type.includes('matroska') ||
      type.includes('quicktime') ||
      type.includes('mp4') ||
      type.includes('webm');

    if (!isValid) {
      this.logger.warn('Rejected video type:', 'FaceVerificationService', type);
      throw new Error(
        `Formato de video no válido (${type}). Aceptamos cualquier formato de video.`,
      );
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('El video es demasiado grande. Tamaño máximo: 10MB');
    }

    // Check minimum size (at least 100KB to ensure it's not empty)
    const minSize = 100 * 1024; // 100KB
    if (file.size < minSize) {
      throw new Error('El video es demasiado pequeño. Debe tener al menos 3 segundos');
    }
  }

  /**
   * Update user_identity_levels with face verification results
   */
  private async updateIdentityLevelWithResults(
    userId: string,
    videoPath: string,
    result: FaceVerificationResult,
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      selfie_url: videoPath,
      face_match_score: result.face_match_score,
      liveness_score: result.liveness_score ?? null,
      updated_at: new Date().toISOString(),
    };

    // Mark as verified if score is good (>= 70%)
    if (result.face_match_score >= 70) {
      updates['selfie_verified_at'] = new Date().toISOString();
      updates['current_level'] = 3; // Promote to Level 3
    }

    const { error } = await this.supabase
      .from('user_identity_levels')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      console['error']('Failed to update identity level with face results:', error);
      throw new Error('No pudimos guardar los resultados de verificación facial');
    }
  }

  /**
   * Delete selfie video (retry verification)
   */
  async deleteSelfieVideo(): Promise<void> {
    this.loading.set(true);
    this['error'].set(null);

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Get current selfie URL
      const { data: levelData } = await this.supabase
        .from('user_identity_levels')
        .select('selfie_url')
        .eq('user_id', user['id'])
        .single();

      if (!levelData?.selfie_url) {
        return; // Nothing to delete
      }

      const storagePath = this.extractStoragePath(levelData.selfie_url);
      if (storagePath) {
        await this.removeFromIdentityBuckets(storagePath);
      }

      // Clear verification data
      await this.supabase
        .from('user_identity_levels')
        .update({
          selfie_url: null,
          selfie_verified_at: null,
          face_match_score: null,
          liveness_score: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user['id']);

      // Refresh status
      await this.checkFaceVerificationStatus();
    } catch (err) {
      const message = err instanceof Error ? err['message'] : 'No pudimos eliminar el video';
      this['error'].set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  private async uploadToIdentityBucket(
    filePath: string,
    file: File,
  ): Promise<{ bucket: IdentityBucket }> {
    let lastError: unknown;

    for (const bucket of this.identityBuckets) {
      const { error } = await this.supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (!error) {
        if (bucket !== this.identityBuckets[0]) {
          this.logger.warn(`Falling back to bucket ${bucket}`, 'FaceVerificationService');
        }
        return { bucket };
      }

      lastError = error;

      if (!this.isMissingBucketError(error)) {
        break;
      }
    }

    throw lastError ?? new Error('No pudimos subir el video');
  }

  private async createSignedIdentityUrl(
    storagePath: string,
    bucketHint?: IdentityBucket,
    expiresInSeconds: number = 60 * 15,
  ): Promise<string> {
    const buckets = bucketHint
      ? [bucketHint, ...this.identityBuckets.filter((b) => b !== bucketHint)]
      : [...this.identityBuckets];

    let lastError: unknown;
    for (const bucket of buckets) {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, expiresInSeconds);

      if (data?.signedUrl && !error) {
        return data.signedUrl;
      }

      lastError = error;
      if (!this.isMissingBucketError(error)) {
        break;
      }
    }

    throw lastError ?? new Error('No pudimos generar URL firmada');
  }

  private async removeFromIdentityBuckets(storagePath: string): Promise<void> {
    for (const bucket of this.identityBuckets) {
      const { error } = await this.supabase.storage.from(bucket).remove([storagePath]);
      if (!error) {
        return;
      }
    }
  }

  private extractStoragePath(value: string): string | null {
    if (!value) return null;

    try {
      const url = new URL(value);
      const identityIndex = url.pathname.indexOf('/identity-documents/');
      if (identityIndex >= 0) {
        return url.pathname.slice(identityIndex + '/identity-documents/'.length);
      }
      const documentsIndex = url.pathname.indexOf('/documents/');
      if (documentsIndex >= 0) {
        return url.pathname.slice(documentsIndex + '/documents/'.length);
      }
      return null;
    } catch {
      return value;
    }
  }

  private isMissingBucketError(error: unknown): boolean {
    const err = error as { message?: string; status?: number; error?: string };
    const message = `${err?.message ?? ''} ${err?.error ?? ''}`.toLowerCase();
    return (message.includes('bucket') && message.includes('not found')) || err?.status === 404;
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this['error'].set(null);
  }
}
