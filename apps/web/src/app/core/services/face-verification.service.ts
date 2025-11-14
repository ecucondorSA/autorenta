import { inject, Injectable, signal } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { SupabaseClientService } from './supabase-client.service';

/**
 * Face Verification Result from Cloudflare Worker
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
}

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
  private readonly supabase: SupabaseClient = inject(SupabaseClientService).getClient();
  private readonly DOC_VERIFIER_URL =
    environment.docVerifierUrl || 'https://doc-verifier.autorentar.workers.dev';

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

  /**
   * Check current face verification status
   */
  async checkFaceVerificationStatus(): Promise<FaceVerificationStatus> {
    this.loading.set(true);
    this.error.set(null);

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
        .eq('user_id', user.id)
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

      this.status.set(statusData);
      return statusData;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No pudimos verificar el estado de la selfie';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Upload selfie video to storage
   * @param videoFile Video file (MP4/WebM, max 10MB, 3-10 seconds)
   * @returns Storage URL of uploaded video
   */
  async uploadSelfieVideo(videoFile: File): Promise<string> {
    this.loading.set(true);
    this.error.set(null);

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
        .eq('user_id', user.id)
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
      const filePath = `${user.id}/${fileName}`;

      // Upload to identity-documents bucket (or documents bucket if identity-documents doesn't exist)
      const bucketName = 'identity-documents'; // Fallback to 'documents' if needed

      const { error } = await this.supabase.storage
        .from(bucketName)
        .upload(filePath, videoFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        // Fallback to documents bucket
        if (error.message.includes('not found')) {
          const { error: fallbackError } = await this.supabase.storage
            .from('documents')
            .upload(filePath, videoFile, {
              cacheControl: '3600',
              upsert: false,
            });

          if (fallbackError) {
            throw fallbackError;
          }

          // Get public URL
          const {
            data: { publicUrl },
          } = this.supabase.storage.from('documents').getPublicUrl(filePath);

          return publicUrl;
        }

        throw error;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = this.supabase.storage.from(bucketName).getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos subir el video';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Verify face by comparing selfie video with ID document photo
   * @param videoUrl URL of uploaded selfie video
   * @param documentUrl URL of ID document photo (from Level 2)
   * @returns Verification result with face match score
   */
  async verifyFace(videoUrl: string, documentUrl: string): Promise<FaceVerificationResult> {
    this.processing.set(true);
    this.error.set(null);

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Call Cloudflare Worker for face verification
      const response = await fetch(`${this.DOC_VERIFIER_URL}/verify-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_url: videoUrl,
          document_url: documentUrl,
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al verificar la identidad facial');
      }

      const result: FaceVerificationResult = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Verificación facial fallida');
      }

      // Update user_identity_levels with results
      await this.updateIdentityLevelWithResults(user.id, videoUrl, result);

      // Refresh status
      await this.checkFaceVerificationStatus();

      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No pudimos verificar tu identidad facial';
      this.error.set(message);
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
    // Check file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      throw new Error(
        'Formato de video no válido. Por favor usa MP4, WebM o MOV (máx 10MB, 3-10 segundos)',
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
    videoUrl: string,
    result: FaceVerificationResult,
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      selfie_url: videoUrl,
      face_match_score: result.face_match_score,
      liveness_score: result.liveness_score ?? null,
      updated_at: new Date().toISOString(),
    };

    // Mark as verified if score is good (>= 70%)
    if (result.face_match_score >= 70) {
      updates.selfie_verified_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('user_identity_levels')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to update identity level with face results:', error);
      throw new Error('No pudimos guardar los resultados de verificación facial');
    }
  }

  /**
   * Delete selfie video (retry verification)
   */
  async deleteSelfieVideo(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

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
        .eq('user_id', user.id)
        .single();

      if (!levelData?.selfie_url) {
        return; // Nothing to delete
      }

      // Extract storage path from URL
      const url = new URL(levelData.selfie_url);
      const pathParts = url.pathname.split('/identity-documents/');
      const storagePath = pathParts.length > 1 ? pathParts[1] : null;

      if (storagePath) {
        // Try identity-documents bucket first
        await this.supabase.storage.from('identity-documents').remove([storagePath]);

        // Fallback to documents bucket
        const pathPartsDocuments = url.pathname.split('/documents/');
        if (pathPartsDocuments.length > 1) {
          await this.supabase.storage.from('documents').remove([pathPartsDocuments[1]]);
        }
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
        .eq('user_id', user.id);

      // Refresh status
      await this.checkFaceVerificationStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos eliminar el video';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }
}
