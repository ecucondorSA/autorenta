import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractedFrame {
  blob: Blob;
  timestamp_ms: number;
  suggestedArea?: string;
}

export interface UploadedFrame {
  url: string;
  timestamp_ms: number;
  suggested_area?: string;
}

export interface DetectedDamage {
  frame_index: number;
  frame_url: string;
  type: 'scratch' | 'dent' | 'crack' | 'stain' | 'missing' | 'other';
  description: string;
  severity: 'minor' | 'moderate' | 'severe';
  location: string;
  confidence: number;
  bounding_box?: { x: number; y: number; width: number; height: number };
  // Local state for user confirmation
  confirmed?: boolean;
  discarded?: boolean;
}

export interface OdometerReading {
  value: number;
  unit: 'km' | 'mi';
  confidence: number;
  frame_url: string;
}

export interface FuelLevelReading {
  percentage: number;
  confidence: number;
  frame_url: string;
}

export interface AreasDetected {
  front: boolean;
  rear: boolean;
  left_side: boolean;
  right_side: boolean;
  interior: boolean;
  dashboard: boolean;
  trunk: boolean;
}

export interface VideoInspectionResult {
  success: boolean;
  damages: DetectedDamage[];
  odometer?: OdometerReading;
  fuel_level?: FuelLevelReading;
  areas_detected: AreasDetected;
  warnings: string[];
  summary: string;
  error?: string;
}

export interface ExtractFramesOptions {
  intervalMs?: number;      // Default: 2000ms
  maxFrames?: number;       // Default: 30
  resolution?: {
    width: number;
    height: number;
  };
  quality?: number;         // 0-1, default: 0.85
}

export type InspectionStage = 'check_in' | 'check_out' | 'renter_check_in';

// Labels for display
export const DAMAGE_TYPE_LABELS: Record<DetectedDamage['type'], string> = {
  scratch: 'Rayón',
  dent: 'Abolladura',
  crack: 'Grieta',
  stain: 'Mancha',
  missing: 'Faltante',
  other: 'Otro',
};

export const SEVERITY_LABELS: Record<DetectedDamage['severity'], string> = {
  minor: 'Menor',
  moderate: 'Moderado',
  severe: 'Severo',
};

export const AREA_LABELS: Record<keyof AreasDetected, string> = {
  front: 'Frente',
  rear: 'Trasera',
  left_side: 'Lateral Izquierdo',
  right_side: 'Lateral Derecho',
  interior: 'Interior',
  dashboard: 'Tablero',
  trunk: 'Maletero',
};

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Video Inspection AI Service
 *
 * Provides functionality to analyze vehicle inspection videos using AI.
 * - Extracts frames from recorded video
 * - Uploads frames to Supabase Storage
 * - Calls Edge Function for AI analysis (Gemini Vision)
 * - Returns detected damages, odometer, fuel level
 */
@Injectable({
  providedIn: 'root',
})
export class VideoInspectionAIService {
  private readonly supabaseClient = inject(SupabaseClientService).getClient();
  private readonly logger = inject(LoggerService);

  private readonly FRAMES_BUCKET = 'car-images';
  private readonly EDGE_FUNCTION_URL = 'analyze-video-inspection';

  // ============================================================================
  // FRAME EXTRACTION
  // ============================================================================

  /**
   * Extracts frames from a video blob at regular intervals
   *
   * 🚀 PERF: Uses scheduler.yield() to avoid blocking main thread
   * - Yields to browser between frames to keep UI responsive
   * - Reports progress via optional callback
   * - Falls back to requestAnimationFrame if scheduler unavailable
   *
   * @param video - The video blob to extract frames from
   * @param options - Extraction options (interval, max frames, resolution)
   * @param onProgress - Optional callback for progress updates (0-100)
   * @returns Promise resolving to array of extracted frames
   */
  async extractFrames(
    video: Blob,
    options?: ExtractFramesOptions,
    onProgress?: (progress: number) => void,
  ): Promise<ExtractedFrame[]> {
    const {
      intervalMs = 2000,
      maxFrames = 30,
      resolution = { width: 1920, height: 1080 },
      quality = 0.85,
    } = options || {};

    this.logger.info(`Extracting frames from video: ${video.size} bytes, interval: ${intervalMs}ms`, 'VideoInspectionAI');

    return new Promise((resolve, reject) => {
      const videoEl = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = resolution.width;
      canvas.height = resolution.height;

      const objectUrl = URL.createObjectURL(video);
      videoEl.src = objectUrl;
      videoEl.muted = true;
      videoEl.playsInline = true;

      const frames: ExtractedFrame[] = [];

      videoEl.onloadedmetadata = async () => {
        const duration = videoEl.duration * 1000; // Convert to ms
        const totalFrames = Math.min(Math.ceil(duration / intervalMs), maxFrames);
        this.logger.info(`Video duration: ${duration}ms, extracting ~${totalFrames} frames`, 'VideoInspectionAI');

        try {
          for (let time = 0; time < duration && frames.length < maxFrames; time += intervalMs) {
            videoEl.currentTime = time / 1000;

            await new Promise<void>((seekResolve) => {
              videoEl.onseeked = () => seekResolve();
            });

            // Draw frame to canvas
            ctx.drawImage(videoEl, 0, 0, resolution.width, resolution.height);

            // Convert to blob
            const blob = await new Promise<Blob>((blobResolve, blobReject) => {
              canvas.toBlob(
                (b) => {
                  if (b) blobResolve(b);
                  else blobReject(new Error('Failed to create blob from canvas'));
                },
                'image/jpeg',
                quality
              );
            });

            frames.push({
              blob,
              timestamp_ms: time,
            });

            // Report progress
            const progress = Math.round((frames.length / totalFrames) * 100);
            onProgress?.(progress);

            // 🚀 PERF: Yield to browser to keep UI responsive
            // Uses scheduler.yield() if available (modern browsers)
            // Falls back to requestAnimationFrame for older browsers
            await this.yieldToMain();
          }

          URL.revokeObjectURL(objectUrl);
          this.logger.info(`Extracted ${frames.length} frames`, 'VideoInspectionAI');
          resolve(frames);
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };

      videoEl.onerror = (error) => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`Video load error: ${error}`));
      };
    });
  }

  /**
   * Yields execution to the main thread to keep UI responsive
   * Uses scheduler.yield() if available, falls back to rAF
   */
  private yieldToMain(): Promise<void> {
    // Use scheduler.yield() if available (Chromium 115+)
    const scheduler = (globalThis as Record<string, unknown>)['scheduler'] as { yield?: () => Promise<void> } | undefined;
    if (scheduler?.yield) {
      return scheduler.yield();
    }

    // Fallback to requestAnimationFrame for older browsers
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  // ============================================================================
  // FRAME UPLOAD
  // ============================================================================

  /**
   * Uploads extracted frames to Supabase Storage
   *
   * @param frames - Array of extracted frames
   * @param bookingId - The booking ID for folder organization
   * @param stage - The inspection stage (check_in, check_out, etc.)
   * @returns Promise resolving to array of uploaded frame URLs
   */
  async uploadFrames(
    frames: ExtractedFrame[],
    bookingId: string,
    stage: InspectionStage
  ): Promise<UploadedFrame[]> {
    this.logger.info(`Uploading ${frames.length} frames for booking ${bookingId}`, 'VideoInspectionAI');

    const uploadedFrames: UploadedFrame[] = [];
    const timestamp = Date.now();

    // Upload frames in parallel with concurrency limit
    const CONCURRENCY = 5;
    for (let i = 0; i < frames.length; i += CONCURRENCY) {
      const batch = frames.slice(i, i + CONCURRENCY);
      const batchPromises = batch.map(async (frame, batchIndex) => {
        const frameIndex = i + batchIndex;
        const filePath = `inspections/${bookingId}/${stage}/${timestamp}_frame_${String(frameIndex).padStart(3, '0')}.jpg`;

        const { data, error } = await this.supabaseClient.storage
          .from(this.FRAMES_BUCKET)
          .upload(filePath, frame.blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true,
          });

        if (error) {
          this.logger.error(`Failed to upload frame ${frameIndex}`, 'VideoInspectionAI', error);
          return null;
        }

        // Get public URL
        const { data: urlData } = this.supabaseClient.storage
          .from(this.FRAMES_BUCKET)
          .getPublicUrl(data.path);

        const uploaded: UploadedFrame = {
          url: urlData.publicUrl,
          timestamp_ms: frame.timestamp_ms,
        };
        if (frame.suggestedArea) {
          uploaded.suggested_area = frame.suggestedArea;
        }
        return uploaded;
      });

      const results = await Promise.all(batchPromises);
      for (const r of results) {
        if (r !== null) {
          uploadedFrames.push(r);
        }
      }
    }

    this.logger.info(`Uploaded ${uploadedFrames.length} frames successfully`, 'VideoInspectionAI');
    return uploadedFrames;
  }

  // ============================================================================
  // AI ANALYSIS
  // ============================================================================

  /**
   * Calls the Edge Function to analyze frames with Gemini Vision
   *
   * @param bookingId - The booking ID
   * @param stage - The inspection stage
   * @param frames - Array of uploaded frame URLs
   * @returns Observable with the analysis result
   */
  analyzeFrames(
    bookingId: string,
    stage: InspectionStage,
    frames: UploadedFrame[]
  ): Observable<VideoInspectionResult> {
    this.logger.info(`Analyzing ${frames.length} frames for booking ${bookingId}`, 'VideoInspectionAI');

    return from(
      this.supabaseClient.functions.invoke<VideoInspectionResult>(this.EDGE_FUNCTION_URL, {
        body: {
          booking_id: bookingId,
          stage,
          frames: frames.map((f) => ({
            url: f.url,
            timestamp_ms: f.timestamp_ms,
            suggested_area: f.suggested_area,
          })),
        },
      })
    ).pipe(
      map((response) => {
        if (response.error) {
          this.logger.error('Edge function error', 'VideoInspectionAI', response.error);
          throw new Error(response.error.message || 'Error al analizar frames');
        }

        if (!response.data) {
          throw new Error('No data returned from analysis');
        }

        return response.data;
      }),
      catchError((error) => {
        this.logger.error('Analysis failed', 'VideoInspectionAI', error);
        return of({
          success: false,
          damages: [],
          areas_detected: {
            front: false,
            rear: false,
            left_side: false,
            right_side: false,
            interior: false,
            dashboard: false,
            trunk: false,
          },
          warnings: ['Error al analizar el video'],
          summary: 'Error de análisis',
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      })
    );
  }

  // ============================================================================
  // COMPLETE FLOW
  // ============================================================================

  /**
   * Complete flow: extract frames, upload, analyze
   *
   * @param video - The video blob to process
   * @param bookingId - The booking ID
   * @param stage - The inspection stage
   * @param onProgress - Optional callback for progress updates
   * @returns Observable with the final analysis result
   */
  processVideoInspection(
    video: Blob,
    bookingId: string,
    stage: InspectionStage,
    onProgress?: (step: string, progress: number) => void
  ): Observable<VideoInspectionResult> {
    return from(this.runFullFlow(video, bookingId, stage, onProgress));
  }

  private async runFullFlow(
    video: Blob,
    bookingId: string,
    stage: InspectionStage,
    onProgress?: (step: string, progress: number) => void
  ): Promise<VideoInspectionResult> {
    try {
      // Step 1: Extract frames (0-30%)
      // 🚀 PERF: Uses granular progress callback for responsive UI
      onProgress?.('Extrayendo frames del video...', 0);
      const frames = await this.extractFrames(
        video,
        { intervalMs: 2000, maxFrames: 30 },
        (extractProgress) => {
          // Map 0-100 extraction progress to 0-30 overall progress
          const overallProgress = Math.round(extractProgress * 0.3);
          onProgress?.('Extrayendo frames del video...', overallProgress);
        },
      );

      if (frames.length === 0) {
        return {
          success: false,
          damages: [],
          areas_detected: {
            front: false,
            rear: false,
            left_side: false,
            right_side: false,
            interior: false,
            dashboard: false,
            trunk: false,
          },
          warnings: ['No se pudieron extraer frames del video'],
          summary: 'Error de extracción',
          error: 'No frames extracted',
        };
      }

      // Step 2: Upload frames (30-60%)
      onProgress?.('Subiendo frames...', 30);
      const uploadedFrames = await this.uploadFrames(frames, bookingId, stage);
      onProgress?.('Subiendo frames...', 60);

      if (uploadedFrames.length === 0) {
        return {
          success: false,
          damages: [],
          areas_detected: {
            front: false,
            rear: false,
            left_side: false,
            right_side: false,
            interior: false,
            dashboard: false,
            trunk: false,
          },
          warnings: ['No se pudieron subir los frames'],
          summary: 'Error de upload',
          error: 'No frames uploaded',
        };
      }

      // Step 3: Analyze with AI (60-100%)
      onProgress?.('Analizando con IA...', 60);

      return new Promise((resolve) => {
        this.analyzeFrames(bookingId, stage, uploadedFrames).subscribe({
          next: (result) => {
            onProgress?.('Análisis completado', 100);
            resolve(result);
          },
          error: (error) => {
            this.logger.error('Analysis error in flow', 'VideoInspectionAI', error);
            resolve({
              success: false,
              damages: [],
              areas_detected: {
                front: false,
                rear: false,
                left_side: false,
                right_side: false,
                interior: false,
                dashboard: false,
                trunk: false,
              },
              warnings: ['Error al analizar con IA'],
              summary: 'Error de análisis',
              error: error instanceof Error ? error.message : 'Error desconocido',
            });
          },
        });
      });
    } catch (error) {
      this.logger.error('Full flow error', 'VideoInspectionAI', error);
      return {
        success: false,
        damages: [],
        areas_detected: {
          front: false,
          rear: false,
          left_side: false,
          right_side: false,
          interior: false,
          dashboard: false,
          trunk: false,
        },
        warnings: ['Error en el proceso de inspección'],
        summary: 'Error del proceso',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Get the count of detected areas
   */
  getDetectedAreasCount(areas: AreasDetected): number {
    return Object.values(areas).filter(Boolean).length;
  }

  /**
   * Get list of missing required areas
   */
  getMissingAreas(areas: AreasDetected): string[] {
    const required: (keyof AreasDetected)[] = ['front', 'rear', 'left_side', 'right_side'];
    return required.filter((area) => !areas[area]).map((area) => AREA_LABELS[area]);
  }

  /**
   * Filter damages by severity
   */
  filterDamagesBySeverity(
    damages: DetectedDamage[],
    severity: DetectedDamage['severity']
  ): DetectedDamage[] {
    return damages.filter((d) => d.severity === severity);
  }

  /**
   * Get confirmed damages (not discarded by user)
   */
  getConfirmedDamages(damages: DetectedDamage[]): DetectedDamage[] {
    return damages.filter((d) => !d.discarded);
  }

  /**
   * Calculate minimum video duration in seconds
   */
  getMinVideoSeconds(): number {
    return 30;
  }

  /**
   * Calculate recommended video duration in seconds
   */
  getRecommendedVideoSeconds(): number {
    return 60;
  }
}
