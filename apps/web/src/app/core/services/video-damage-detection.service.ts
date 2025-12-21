import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SupabaseClientService } from './supabase-client.service';

/**
 * Resultado del análisis de video de inspección
 */
export interface VideoDamageAnalysis {
  success: boolean;
  bookingId: string;
  inspectionType: 'checkin' | 'checkout';
  damages: DetectedDamage[];
  summary: string;
  confidence: number;
  videoUrl: string;
  processedAt: string;
  error?: string;
}

/**
 * Daño detectado en el video con timestamp
 */
export interface DetectedDamage {
  id: string;
  type: 'scratch' | 'dent' | 'broken_light' | 'tire_wear' | 'interior_damage' | 'other';
  description: string;
  severity: 'minor' | 'moderate' | 'severe';
  confidence: number; // 0-1
  timestamp: number; // segundos en el video
  location: string; // "front-left", "rear-bumper", etc.
  estimatedCostUsd: number;
  requiresAction: boolean;
}

/**
 * Parámetros para subir video de inspección
 */
export interface UploadInspectionVideoParams {
  bookingId: string;
  inspectionType: 'checkin' | 'checkout';
  videoFile: File;
  carId: string;
  userId: string;
}

/**
 * Response de la URL firmada para upload
 */
export interface SignedUploadUrlResponse {
  uploadUrl: string;
  videoPath: string;
  expiresAt: string;
}

/**
 * Video Damage Detection Service
 * 
 * Integración con GCP Video Processing Pipeline:
 * 
 * FLUJO:
 * 1. Frontend sube video → Cloud Storage (signed URL)
 * 2. Cloud Storage → Pub/Sub notification
 * 3. Pub/Sub → Cloud Run (video-processing-service)
 * 4. Cloud Run → Vertex AI (análisis de daños)
 * 5. Cloud Run → Supabase (resultados estructurados)
 * 6. Frontend → Polling/Realtime subscription (resultados)
 * 
 * ARQUITECTURA GCP:
 * - video-ingestion-service (Cloud Run): Genera signed URLs
 * - video-source-document-bucket (Cloud Storage): Almacena videos
 * - video-doc-upload-topic (Pub/Sub): Notificaciones de nuevos videos
 * - video-processing-service (Cloud Run): Orquesta análisis
 * - video-vertex-ai-service (Vertex AI): Detección de daños con IA
 * - video-processing-log-db (Cloud SQL): Log de procesamiento
 * - video-summarized-archive-bucket: Resultados procesados
 * 
 * @example
 * ```typescript
 * const service = inject(VideoDamageDetectionService);
 * 
 * // 1. Subir video de check-in
 * await service.uploadInspectionVideo({
 *   bookingId: 'booking_123',
 *   inspectionType: 'checkin',
 *   videoFile: videoBlob,
 *   carId: 'car_456',
 *   userId: 'user_789'
 * });
 * 
 * // 2. Esperar resultados (realtime o polling)
 * service.analysisResults$.subscribe(result => {
 *   console.log('Daños detectados:', result.damages);
 * });
 * 
 * // 3. Comparar check-in vs check-out
 * const comparison = await service.compareInspections(
 *   'booking_123'
 * );
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class VideoDamageDetectionService {
  private readonly http = inject(HttpClient);
  private readonly supabase = inject(SupabaseClientService);

  /**
   * URL del servicio de ingesta de videos en GCP Cloud Run
   * Configurable via env: NG_APP_VIDEO_INGESTION_URL
   */
  private readonly VIDEO_INGESTION_URL = environment.videoIngestionUrl || 
    'https://video-ingestion-service-XXXXX.run.app';

  /**
   * Estado de análisis en progreso
   */
  readonly isProcessing = signal(false);

  /**
   * Último error
   */
  readonly lastError = signal<string | null>(null);

  /**
   * Progreso de upload (0-100)
   */
  readonly uploadProgress = signal(0);

  // ============================================
  // 1. UPLOAD DE VIDEO
  // ============================================

  /**
   * Sube un video de inspección a GCP Cloud Storage
   * 
   * PASO 1: Solicita signed URL al servicio de ingesta
   * PASO 2: Sube el video directamente a Cloud Storage
   * PASO 3: Notifica a Supabase que el video está listo
   * 
   * @param params - Datos de la inspección y archivo de video
   * @returns Path del video en Cloud Storage
   */
  async uploadInspectionVideo(params: UploadInspectionVideoParams): Promise<string> {
    try {
      this.isProcessing.set(true);
      this.lastError.set(null);
      this.uploadProgress.set(0);

      // Validaciones
      if (!params.videoFile) {
        throw new Error('No se proporcionó archivo de video');
      }

      if (!params.videoFile.type.startsWith('video/')) {
        throw new Error('El archivo debe ser un video');
      }

      // Límite de tamaño: 500MB
      const MAX_SIZE = 500 * 1024 * 1024;
      if (params.videoFile.size > MAX_SIZE) {
        throw new Error('El video no puede superar 500MB');
      }

      // PASO 1: Solicitar signed URL para upload
      const signedUrlResponse = await this.getSignedUploadUrl({
        bookingId: params.bookingId,
        inspectionType: params.inspectionType,
        fileName: params.videoFile.name,
        contentType: params.videoFile.type,
      });

      this.uploadProgress.set(10);

      // PASO 2: Subir video directamente a Cloud Storage
      await this.uploadToCloudStorage(
        signedUrlResponse.uploadUrl,
        params.videoFile
      );

      this.uploadProgress.set(90);

      // PASO 3: Registrar en Supabase que el video está listo para procesamiento
      await this.registerVideoInSupabase({
        bookingId: params.bookingId,
        inspectionType: params.inspectionType,
        videoPath: signedUrlResponse.videoPath,
        carId: params.carId,
        userId: params.userId,
        status: 'processing',
      });

      this.uploadProgress.set(100);
      this.isProcessing.set(false);

      return signedUrlResponse.videoPath;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error al subir video';
      this.lastError.set(errorMsg);
      this.isProcessing.set(false);
      throw error;
    }
  }

  /**
   * Obtiene una URL firmada para subir el video a Cloud Storage
   * 
   * Llama al servicio de ingesta en GCP Cloud Run:
   * POST /api/upload-url
   */
  private async getSignedUploadUrl(params: {
    bookingId: string;
    inspectionType: 'checkin' | 'checkout';
    fileName: string;
    contentType: string;
  }): Promise<SignedUploadUrlResponse> {
    const response = await firstValueFrom(
      this.http.post<SignedUploadUrlResponse>(
        `${this.VIDEO_INGESTION_URL}/api/upload-url`,
        params
      )
    );

    return response;
  }

  /**
   * Sube el video a Cloud Storage usando la URL firmada
   */
  private async uploadToCloudStorage(
    signedUrl: string,
    videoFile: File
  ): Promise<void> {
    const headers = new HttpHeaders({
      'Content-Type': videoFile.type,
    });

    await firstValueFrom(
      this.http.put(signedUrl, videoFile, {
        headers,
        reportProgress: true,
        observe: 'events',
      })
    );
  }

  /**
   * Registra el video en Supabase para tracking
   */
  private async registerVideoInSupabase(params: {
    bookingId: string;
    inspectionType: 'checkin' | 'checkout';
    videoPath: string;
    carId: string;
    userId: string;
    status: 'processing' | 'completed' | 'failed';
  }): Promise<void> {
    const { error } = await this.supabase.getClient()
      .from('inspection_videos')
      .insert({
        booking_id: params.bookingId,
        inspection_type: params.inspectionType,
        video_path: params.videoPath,
        car_id: params.carId,
        user_id: params.userId,
        status: params.status,
        created_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Error al registrar video: ${error.message}`);
    }
  }

  // ============================================
  // 2. OBTENER RESULTADOS DE ANÁLISIS
  // ============================================

  /**
   * Obtiene los resultados del análisis de un video
   * 
   * Los resultados son escritos por el video-processing-service
   * en la tabla `video_damage_analysis`
   * 
   * @param bookingId - ID del booking
   * @param inspectionType - Tipo de inspección
   * @returns Análisis de daños o null si aún no está procesado
   */
  async getAnalysisResults(
    bookingId: string,
    inspectionType: 'checkin' | 'checkout'
  ): Promise<VideoDamageAnalysis | null> {
    const { data, error } = await this.supabase.getClient()
      .from('video_damage_analysis')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('inspection_type', inspectionType)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToVideoDamageAnalysis(data);
  }

  /**
   * Mapea los datos de Supabase al formato del servicio
   */
  private mapToVideoDamageAnalysis(data: any): VideoDamageAnalysis {
    return {
      success: true,
      bookingId: data.booking_id,
      inspectionType: data.inspection_type,
      damages: data.damages || [],
      summary: data.summary || '',
      confidence: data.confidence || 0,
      videoUrl: data.video_url || '',
      processedAt: data.processed_at,
    };
  }

  // ============================================
  // 3. COMPARACIÓN CHECK-IN vs CHECK-OUT
  // ============================================

  /**
   * Compara los resultados de check-in y check-out
   * para determinar daños nuevos
   * 
   * @param bookingId - ID del booking
   * @returns Lista de daños nuevos detectados en check-out
   */
  async compareInspections(bookingId: string): Promise<{
    newDamages: DetectedDamage[];
    summary: string;
    totalEstimatedCost: number;
  }> {
    // Obtener ambos análisis
    const [checkinAnalysis, checkoutAnalysis] = await Promise.all([
      this.getAnalysisResults(bookingId, 'checkin'),
      this.getAnalysisResults(bookingId, 'checkout'),
    ]);

    if (!checkinAnalysis || !checkoutAnalysis) {
      throw new Error('Faltan videos de inspección para comparar');
    }

    // Detectar daños nuevos (presentes en checkout pero no en checkin)
    const newDamages = this.detectNewDamages(
      checkinAnalysis.damages,
      checkoutAnalysis.damages
    );

    const totalEstimatedCost = newDamages.reduce(
      (sum, damage) => sum + damage.estimatedCostUsd,
      0
    );

    const summary = this.generateDamageSummary(newDamages);

    return {
      newDamages,
      summary,
      totalEstimatedCost,
    };
  }

  /**
   * Detecta daños nuevos comparando dos listas
   */
  private detectNewDamages(
    checkinDamages: DetectedDamage[],
    checkoutDamages: DetectedDamage[]
  ): DetectedDamage[] {
    // Simple heurística: buscar daños en checkout que no están en checkin
    // basándose en type + location
    return checkoutDamages.filter(checkoutDamage => {
      const existsInCheckin = checkinDamages.some(checkinDamage =>
        checkinDamage.type === checkoutDamage.type &&
        checkinDamage.location === checkoutDamage.location
      );
      return !existsInCheckin;
    });
  }

  /**
   * Genera un resumen legible de los daños
   */
  private generateDamageSummary(damages: DetectedDamage[]): string {
    if (damages.length === 0) {
      return 'No se detectaron daños nuevos.';
    }

    const summary = damages.map(d =>
      `${d.type} ${d.severity} en ${d.location} (${d.confidence * 100}% confianza)`
    ).join(', ');

    return `Se detectaron ${damages.length} daño(s) nuevo(s): ${summary}`;
  }

  // ============================================
  // 4. REALTIME SUBSCRIPTION (OPCIONAL)
  // ============================================

  /**
   * Suscribirse a cambios en los análisis de video
   * 
   * Útil para mostrar resultados en tiempo real cuando
   * el video-processing-service termina el análisis
   */
  subscribeToAnalysisResults(
    bookingId: string,
    callback: (analysis: VideoDamageAnalysis) => void
  ) {
    return this.supabase.getClient()
      .channel(`video_analysis_${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_damage_analysis',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const analysis = this.mapToVideoDamageAnalysis(payload.new);
          callback(analysis);
        }
      )
      .subscribe();
  }
}
