import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

// ============================================================================
// TYPES
// ============================================================================

export interface LiveAnalysisEvent {
  type:
    | 'area_detected'
    | 'damage_found'
    | 'odometer_read'
    | 'fuel_read'
    | 'guidance'
    | 'quality_warning'
    | 'text'
    | 'error'
    | 'connected'
    | 'disconnected'
    | 'limit_reached';
  message: string;
  data?: {
    area?: string;
    confidence?: number;
    damage?: {
      type: string;
      description: string;
      severity: string;
      location: string;
      confidence: number;
    };
    odometer?: { value: number; unit: string; confidence: number };
    fuel_level?: { percentage: number; confidence: number };
    image_quality?: ImageQualityReport;
    forensic_notes?: string;
  };
  timestamp: number;
}

export interface ImageQualityReport {
  score: number;
  lighting: 'excellent' | 'good' | 'poor' | 'very_poor';
  focus: 'sharp' | 'acceptable' | 'blurry' | 'very_blurry';
  angle: 'optimal' | 'acceptable' | 'suboptimal' | 'unusable';
  coverage: 'complete' | 'partial' | 'minimal';
  issues: string[];
}

export interface VisibilityReport {
  clearly_visible: string[];
  partially_visible: string[];
  obstructed_or_hidden: string[];
}

export interface DetectedAreaState {
  front: boolean;
  rear: boolean;
  left_side: boolean;
  right_side: boolean;
  interior: boolean;
  dashboard: boolean;
  trunk: boolean;
}

export interface AreaConfidence {
  front: number;
  rear: number;
  left_side: number;
  right_side: number;
  interior: number;
  dashboard: number;
  trunk: number;
}

export interface ForensicRecord {
  timestamp: number;
  frame_number: number;
  area: string;
  area_confidence: number;
  image_quality: ImageQualityReport;
  what_was_visible: VisibilityReport;
  forensic_notes: string;
  damages_detected: number;
}

export interface LiveInspectionState {
  connected: boolean;
  areas_detected: DetectedAreaState;
  area_confidence: AreaConfidence;
  damages: Array<{
    type: string;
    description: string;
    severity: string;
    location: string;
    confidence: number;
    timestamp: number;
  }>;
  odometer?: { value: number; unit: string; confidence: number };
  fuel_level?: { percentage: number; confidence: number };
  last_message: string;
  events: LiveAnalysisEvent[];
  forensic_log: ForensicRecord[];
}

interface GeminiForensicResponse {
  area: string;
  area_confidence: number;
  area_reasoning: string;
  image_quality: ImageQualityReport;
  what_i_can_see: VisibilityReport;
  damages: Array<{
    type: string;
    severity: string;
    location: string;
    confidence: number;
    description: string;
    measurable?: string;
  }>;
  odometer: number | null;
  odometer_confidence: number;
  fuel_level: number | null;
  fuel_confidence: number;
  forensic_notes: string;
  guidance:
    | {
        message: string;
        what_to_show: string;
        why: string;
        tips: string;
      }
    | string;
}

// Inspection limits
const MAX_FRAMES = 40; // Maximum 40 frames (~4 minutes at 6s intervals)
const MAX_TIME_SECONDS = 240; // Maximum 4 minutes
const MIN_CONFIDENCE_FOR_AREA = 70; // Minimum confidence to mark area as detected
const FRAME_INTERVAL_MS = 6000; // 6 seconds between frames for thorough analysis

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Gemini Live Service
 *
 * Analyzes vehicle inspection video frames using Gemini's generateContent API.
 * Uses a polling approach instead of WebSocket for stability.
 *
 * Features:
 * - Captures video frames at configurable intervals
 * - Sends to Edge Function for analysis
 * - Tracks detected areas and damages
 * - Provides real-time feedback
 */
@Injectable({
  providedIn: 'root',
})
export class GeminiLiveService {
  private readonly supabaseClient = inject(SupabaseClientService).getClient();
  private readonly logger = inject(LoggerService);

  private frameInterval: ReturnType<typeof setInterval> | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private isAnalyzing = false;

  // Event emitter for analysis results
  private readonly eventsSubject = new Subject<LiveAnalysisEvent>();
  readonly events$ = this.eventsSubject.asObservable();

  // State signals
  readonly connectionState = signal<ConnectionState>('disconnected');
  readonly isConnected = computed(() => this.connectionState() === 'connected');
  readonly lastMessage = signal<string>('');

  readonly areasDetected = signal<DetectedAreaState>({
    front: false,
    rear: false,
    left_side: false,
    right_side: false,
    interior: false,
    dashboard: false,
    trunk: false,
  });

  readonly areaConfidence = signal<AreaConfidence>({
    front: 0,
    rear: 0,
    left_side: 0,
    right_side: 0,
    interior: 0,
    dashboard: 0,
    trunk: 0,
  });

  readonly detectedAreasCount = computed(() => {
    const areas = this.areasDetected();
    return Object.values(areas).filter(Boolean).length;
  });

  readonly missingAreas = computed(() => {
    const areas = this.areasDetected();
    const labels: Record<keyof DetectedAreaState, string> = {
      front: 'Frente',
      rear: 'Trasera',
      left_side: 'Lateral Izquierdo',
      right_side: 'Lateral Derecho',
      interior: 'Interior',
      dashboard: 'Tablero',
      trunk: 'Maletero',
    };
    const required: (keyof DetectedAreaState)[] = ['front', 'rear', 'left_side', 'right_side'];
    return required.filter((key) => !areas[key]).map((key) => labels[key]);
  });

  readonly damages = signal<
    Array<{
      type: string;
      description: string;
      severity: string;
      location: string;
      confidence: number;
      timestamp: number;
    }>
  >([]);

  readonly odometer = signal<{ value: number; unit: string; confidence: number } | null>(null);
  readonly fuelLevel = signal<{ percentage: number; confidence: number } | null>(null);

  // Forensic log for legal evidence
  readonly forensicLog = signal<ForensicRecord[]>([]);

  // Current image quality
  readonly currentImageQuality = signal<ImageQualityReport | null>(null);

  // Config from gemini-live-config Edge Function
  private readonly configSystemPrompt = signal<string | null>(null);
  private readonly configModel = signal<string | null>(null);
  private readonly configWebsocketUrl = signal<string | null>(null);

  // Inspection start time for limits
  private inspectionStartTime: number | null = null;

  // ============================================================================
  // CONNECTION (Simplified - no WebSocket needed)
  // ============================================================================

  /**
   * Connect to Gemini analysis service
   * Fetches config from gemini-live-config Edge Function, then marks as ready.
   * Falls back to default behavior if config fetch fails.
   */
  connect(): Observable<boolean> {
    this.connectionState.set('connecting');
    this.logger.info('Initializing Gemini analysis service...', 'GeminiLive');

    // Fetch config from Edge Function (non-blocking — fallback if it fails)
    this.fetchLiveConfig().then(
      () => this.logger.info('Live config loaded successfully', 'GeminiLive'),
      (err) => this.logger.warn(`Live config fetch failed, using defaults: ${err}`, 'GeminiLive'),
    );

    this.connectionState.set('connected');
    this.emitEvent({
      type: 'connected',
      message: 'Conexión establecida con IA',
      timestamp: Date.now(),
    });

    this.logger.info('Gemini analysis service ready', 'GeminiLive');
    return of(true);
  }

  /**
   * Fetch centralized config from gemini-live-config Edge Function.
   * Stores system prompt, model name, and websocket URL for future use.
   */
  private async fetchLiveConfig(): Promise<void> {
    const { data, error } = await this.supabaseClient.functions.invoke('gemini-live-config');

    if (error) {
      throw new Error(error.message || 'Config fetch failed');
    }

    if (data?.systemPrompt) {
      this.configSystemPrompt.set(data.systemPrompt);
    }
    if (data?.model) {
      this.configModel.set(data.model);
    }
    if (data?.websocketUrl) {
      this.configWebsocketUrl.set(data.websocketUrl);
    }

    this.logger.info(`Config loaded: model=${data?.model || 'default'}`, 'GeminiLive');
  }

  /**
   * Disconnect from Gemini service
   */
  disconnect(): void {
    this.stopFrameCapture();

    this.connectionState.set('disconnected');
    this.emitEvent({
      type: 'disconnected',
      message: 'Desconectado de IA',
      timestamp: Date.now(),
    });

    this.resetState();
  }

  private resetState(): void {
    this.areasDetected.set({
      front: false,
      rear: false,
      left_side: false,
      right_side: false,
      interior: false,
      dashboard: false,
      trunk: false,
    });
    this.areaConfidence.set({
      front: 0,
      rear: 0,
      left_side: 0,
      right_side: 0,
      interior: 0,
      dashboard: 0,
      trunk: 0,
    });
    this.damages.set([]);
    this.odometer.set(null);
    this.fuelLevel.set(null);
    this.lastMessage.set('');
    this.forensicLog.set([]);
    this.currentImageQuality.set(null);
    this.configSystemPrompt.set(null);
    this.configModel.set(null);
    this.configWebsocketUrl.set(null);
    this.inspectionStartTime = null;
  }

  // ============================================================================
  // VIDEO FRAME ANALYSIS
  // ============================================================================

  private frameCount = 0;

  /**
   * Start capturing and analyzing video frames
   * Captures every 4 seconds for more thoughtful analysis
   * Limited to MAX_FRAMES or MAX_TIME_SECONDS
   */
  startFrameCapture(videoElement: HTMLVideoElement): void {
    if (!this.isConnected()) {
      this.logger.warn('Cannot start capture - not connected', 'GeminiLive');
      return;
    }

    this.videoElement = videoElement;

    // Create canvas for frame capture (higher resolution for better analysis)
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 720;
    this.canvasCtx = this.canvas.getContext('2d');

    if (!this.canvasCtx) {
      this.logger.error('Cannot get canvas context', 'GeminiLive');
      return;
    }

    this.frameCount = 0;
    this.inspectionStartTime = Date.now();

    // Capture and analyze frame at configured interval for thorough analysis
    this.frameInterval = setInterval(() => {
      this.captureAndAnalyzeFrame();
    }, FRAME_INTERVAL_MS);

    // Also capture immediately
    this.captureAndAnalyzeFrame();

    this.logger.info(
      `Frame capture started (every ${FRAME_INTERVAL_MS / 1000}s, max ${MAX_FRAMES} frames or ${MAX_TIME_SECONDS}s)`,
      'GeminiLive',
    );
  }

  /**
   * Stop frame capture
   */
  stopFrameCapture(): void {
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
    this.videoElement = null;
    this.canvas = null;
    this.canvasCtx = null;
    this.isAnalyzing = false;
    this.logger.info(
      `Frame capture stopped. Total frames analyzed: ${this.frameCount}`,
      'GeminiLive',
    );
  }

  private async captureAndAnalyzeFrame(): Promise<void> {
    // Skip if already analyzing (prevents overlap)
    if (this.isAnalyzing) {
      this.logger.debug('Skipping frame - analysis in progress', 'GeminiLive');
      return;
    }

    // Check limits
    if (this.frameCount >= MAX_FRAMES) {
      this.logger.warn(`Frame limit reached (${MAX_FRAMES})`, 'GeminiLive');
      this.emitEvent({
        type: 'limit_reached',
        message: `⏱️ Se alcanzó el límite de ${MAX_FRAMES} capturas. Por favor finaliza la inspección o reinicia si necesitas más tiempo.`,
        timestamp: Date.now(),
      });
      this.stopFrameCapture();
      return;
    }

    if (this.inspectionStartTime) {
      const elapsedSeconds = (Date.now() - this.inspectionStartTime) / 1000;
      if (elapsedSeconds >= MAX_TIME_SECONDS) {
        this.logger.warn(`Time limit reached (${MAX_TIME_SECONDS}s)`, 'GeminiLive');
        this.emitEvent({
          type: 'limit_reached',
          message: `⏱️ Se alcanzó el tiempo máximo de inspección (${Math.floor(MAX_TIME_SECONDS / 60)} minutos). Por favor finaliza la inspección.`,
          timestamp: Date.now(),
        });
        this.stopFrameCapture();
        return;
      }
    }

    if (!this.videoElement || !this.canvas || !this.canvasCtx) {
      this.logger.warn('Cannot capture frame - missing resources', 'GeminiLive');
      return;
    }

    // Check if video is ready
    const videoReady = this.videoElement.readyState >= 2;
    const videoWidth = this.videoElement.videoWidth;
    const videoHeight = this.videoElement.videoHeight;

    if (!videoReady || videoWidth === 0 || videoHeight === 0) {
      this.logger.warn(`Video not ready: readyState=${this.videoElement.readyState}`, 'GeminiLive');
      return;
    }

    this.isAnalyzing = true;
    this.frameCount++;

    try {
      // Draw video frame to canvas
      this.canvasCtx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);

      // Convert to base64 JPEG (higher quality for forensic analysis)
      const dataUrl = this.canvas.toDataURL('image/jpeg', 0.85);
      const base64Data = dataUrl.split(',')[1];

      this.logger.info(`📸 Analyzing frame #${this.frameCount}/${MAX_FRAMES}...`, 'GeminiLive');

      // Build detailed context for the API
      const detectedAreas = this.areasDetected();
      const areaConf = this.areaConfidence();
      const inspectedAreas = Object.entries(detectedAreas)
        .filter(([, detected]) => detected)
        .map(([area]) => `${area} (${areaConf[area as keyof AreaConfidence]}% confianza)`);

      const missingAreas = this.missingAreas();
      const damageCount = this.damages().length;

      let context = `Frame ${this.frameCount} de la inspección.\n`;
      if (inspectedAreas.length > 0) {
        context += `Áreas ya verificadas: ${inspectedAreas.join(', ')}.\n`;
      }
      if (missingAreas.length > 0) {
        context += `Áreas pendientes OBLIGATORIAS: ${missingAreas.join(', ')}.\n`;
      }
      if (damageCount > 0) {
        context += `Daños detectados hasta ahora: ${damageCount}.\n`;
      }
      context += `Por favor, guía al usuario de forma calmada y específica sobre qué mostrar.`;

      // Call Edge Function — include centralized system prompt if available
      const body: Record<string, unknown> = {
        image: base64Data,
        context,
      };

      const systemPrompt = this.configSystemPrompt();
      if (systemPrompt) {
        body['systemPrompt'] = systemPrompt;
      }

      const { data, error } = await this.supabaseClient.functions.invoke('gemini-analyze-frame', {
        body,
      });

      if (error) {
        throw new Error(error.message || 'Error al analizar imagen');
      }

      if (data?.analysis) {
        this.processForensicResponse(data.analysis);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Analysis failed: ${errorMsg}`, 'GeminiLive');

      this.emitEvent({
        type: 'error',
        message: `Error al analizar: ${errorMsg}`,
        timestamp: Date.now(),
      });
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Process the forensic response from Gemini
   * Handles the detailed analysis with confidence levels and forensic logging
   */
  private processForensicResponse(analysis: GeminiForensicResponse): void {
    const confidence = analysis.area_confidence || 0;
    this.logger.info(
      `🤖 Analysis: area=${analysis.area} (${confidence}%), damages=${analysis.damages?.length || 0}, quality=${analysis.image_quality?.score || 'N/A'}%`,
      'GeminiLive',
    );

    // Update image quality
    if (analysis.image_quality) {
      this.currentImageQuality.set(analysis.image_quality);

      // Warn if image quality is poor
      if (analysis.image_quality.score < 50) {
        this.emitEvent({
          type: 'quality_warning',
          message: `⚠️ Calidad de imagen baja (${analysis.image_quality.score}%). ${analysis.image_quality.issues?.join('. ') || 'Intenta mejorar la iluminación o el enfoque.'}`,
          data: { image_quality: analysis.image_quality },
          timestamp: Date.now(),
        });
      }
    }

    // Log forensic record
    const forensicRecord: ForensicRecord = {
      timestamp: Date.now(),
      frame_number: this.frameCount,
      area: analysis.area || 'unknown',
      area_confidence: confidence,
      image_quality: analysis.image_quality || {
        score: 0,
        lighting: 'poor',
        focus: 'blurry',
        angle: 'suboptimal',
        coverage: 'minimal',
        issues: ['No se pudo evaluar la calidad'],
      },
      what_was_visible: analysis.what_i_can_see || {
        clearly_visible: [],
        partially_visible: [],
        obstructed_or_hidden: [],
      },
      forensic_notes: analysis.forensic_notes || '',
      damages_detected: analysis.damages?.length || 0,
    };
    this.forensicLog.update((log) => [...log, forensicRecord]);

    // Update detected area ONLY if confidence is high enough
    if (analysis.area && analysis.area !== 'unknown' && confidence >= MIN_CONFIDENCE_FOR_AREA) {
      const areaKey = analysis.area as keyof DetectedAreaState;
      if (areaKey in this.areasDetected()) {
        // Only update if new confidence is higher
        const currentConfidence = this.areaConfidence()[areaKey];
        if (confidence > currentConfidence) {
          this.areasDetected.update((areas) => ({
            ...areas,
            [areaKey]: true,
          }));
          this.areaConfidence.update((conf) => ({
            ...conf,
            [areaKey]: confidence,
          }));

          this.emitEvent({
            type: 'area_detected',
            message: `✅ ${this.getAreaLabel(areaKey)} verificado con ${confidence}% de confianza`,
            data: { area: areaKey, confidence },
            timestamp: Date.now(),
          });
        }
      }
    }

    // Process damages (only with sufficient confidence)
    if (analysis.damages && analysis.damages.length > 0) {
      for (const damage of analysis.damages) {
        const damageConfidence = damage.confidence || 0;
        if (damageConfidence >= 60) {
          const damageEntry = {
            type: damage.type,
            description: damage.description || '',
            severity: damage.severity,
            location: damage.location,
            confidence: damageConfidence,
            timestamp: Date.now(),
          };

          this.damages.update((damages) => [...damages, damageEntry]);

          this.emitEvent({
            type: 'damage_found',
            message: `⚠️ Daño detectado (${damageConfidence}% confianza): ${damage.type} - ${damage.location}${damage.measurable ? ` (~${damage.measurable})` : ''}`,
            data: { damage: damageEntry },
            timestamp: Date.now(),
          });
        }
      }
    }

    // Update odometer (only with sufficient confidence)
    const odometerConf = analysis.odometer_confidence || 0;
    if (analysis.odometer && analysis.odometer > 0 && odometerConf >= 70) {
      this.odometer.set({ value: analysis.odometer, unit: 'km', confidence: odometerConf });

      this.emitEvent({
        type: 'odometer_read',
        message: `📊 Odómetro: ${analysis.odometer.toLocaleString()} km (${odometerConf}% confianza)`,
        data: { odometer: { value: analysis.odometer, unit: 'km', confidence: odometerConf } },
        timestamp: Date.now(),
      });
    }

    // Update fuel level (only with sufficient confidence)
    const fuelConf = analysis.fuel_confidence || 0;
    if (analysis.fuel_level !== null && analysis.fuel_level >= 0 && fuelConf >= 60) {
      this.fuelLevel.set({ percentage: analysis.fuel_level, confidence: fuelConf });

      this.emitEvent({
        type: 'fuel_read',
        message: `⛽ Combustible: ${analysis.fuel_level}% (${fuelConf}% confianza)`,
        data: { fuel_level: { percentage: analysis.fuel_level, confidence: fuelConf } },
        timestamp: Date.now(),
      });
    }

    // Show guidance (handle both string and object format)
    let guidanceMessage = '';
    if (typeof analysis.guidance === 'string') {
      guidanceMessage = analysis.guidance;
    } else if (analysis.guidance) {
      // Build a comprehensive guidance message
      const g = analysis.guidance;
      guidanceMessage = g.message;
      if (g.what_to_show) {
        guidanceMessage += `\n📍 Necesito ver: ${g.what_to_show}`;
      }
      if (g.why) {
        guidanceMessage += `\n💡 Razón: ${g.why}`;
      }
      if (g.tips) {
        guidanceMessage += `\n✨ Consejo: ${g.tips}`;
      }
    }

    if (guidanceMessage) {
      this.lastMessage.set(guidanceMessage);

      this.emitEvent({
        type: 'guidance',
        message: guidanceMessage,
        data: { forensic_notes: analysis.forensic_notes },
        timestamp: Date.now(),
      });
    }
  }

  private getAreaLabel(area: keyof DetectedAreaState): string {
    const labels: Record<keyof DetectedAreaState, string> = {
      front: 'Frente',
      rear: 'Trasera',
      left_side: 'Lateral Izquierdo',
      right_side: 'Lateral Derecho',
      interior: 'Interior',
      dashboard: 'Tablero',
      trunk: 'Maletero',
    };
    return labels[area] || area;
  }

  private emitEvent(event: LiveAnalysisEvent): void {
    this.eventsSubject.next(event);
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Get current inspection state including forensic log
   */
  getInspectionState(): LiveInspectionState {
    return {
      connected: this.isConnected(),
      areas_detected: this.areasDetected(),
      area_confidence: this.areaConfidence(),
      damages: this.damages(),
      odometer: this.odometer() || undefined,
      fuel_level: this.fuelLevel() || undefined,
      last_message: this.lastMessage(),
      events: [],
      forensic_log: this.forensicLog(),
    };
  }

  /**
   * Get a summary of what was verified and what wasn't
   * Useful for generating inspection reports
   */
  getForensicSummary(): {
    verified_areas: string[];
    unverified_areas: string[];
    total_frames: number;
    damages_found: number;
    average_image_quality: number;
    warnings: string[];
  } {
    const areas = this.areasDetected();
    const confidence = this.areaConfidence();
    const log = this.forensicLog();

    const verified: string[] = [];
    const unverified: string[] = [];
    const warnings: string[] = [];

    const areaLabels: Record<string, string> = {
      front: 'Frente',
      rear: 'Trasera',
      left_side: 'Lateral Izquierdo',
      right_side: 'Lateral Derecho',
      interior: 'Interior',
      dashboard: 'Tablero',
      trunk: 'Maletero',
    };

    for (const [key, detected] of Object.entries(areas)) {
      const label = areaLabels[key] || key;
      if (detected) {
        verified.push(`${label} (${confidence[key as keyof AreaConfidence]}% confianza)`);
      } else {
        unverified.push(label);
      }
    }

    // Calculate average image quality
    const qualityScores = log.map((r) => r.image_quality?.score || 0).filter((s) => s > 0);
    const avgQuality =
      qualityScores.length > 0
        ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
        : 0;

    // Add warnings
    if (avgQuality < 60) {
      warnings.push(
        `Calidad de imagen promedio baja (${avgQuality}%). Los resultados pueden no ser confiables.`,
      );
    }

    if (unverified.length > 0) {
      warnings.push(`Áreas no verificadas: ${unverified.join(', ')}. Podrían ocultar daños.`);
    }

    // Check for obstructed areas in forensic notes
    const obstructedNotes = log
      .filter(
        (r) =>
          r.forensic_notes?.toLowerCase().includes('no pude ver') ||
          r.forensic_notes?.toLowerCase().includes('obstruido'),
      )
      .map((r) => r.forensic_notes);
    if (obstructedNotes.length > 0) {
      warnings.push('Algunas áreas estuvieron obstruidas durante la inspección.');
    }

    return {
      verified_areas: verified,
      unverified_areas: unverified,
      total_frames: this.frameCount,
      damages_found: this.damages().length,
      average_image_quality: avgQuality,
      warnings,
    };
  }
}
