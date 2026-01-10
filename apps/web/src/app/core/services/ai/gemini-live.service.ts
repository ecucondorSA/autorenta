import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, Subject, from, of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

// ============================================================================
// TYPES
// ============================================================================

export interface GeminiLiveConfig {
  websocket_url: string;
  model: string;
  system_prompt: string;
  config: {
    response_modalities: string[];
    speech_config: null;
  };
}

export interface LiveAnalysisEvent {
  type: 'area_detected' | 'damage_found' | 'odometer_read' | 'fuel_read' | 'guidance' | 'text' | 'error' | 'connected' | 'disconnected';
  message: string;
  data?: {
    area?: string;
    damage?: {
      type: string;
      description: string;
      severity: string;
      location: string;
    };
    odometer?: { value: number; unit: string };
    fuel_level?: { percentage: number };
  };
  timestamp: number;
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

export interface LiveInspectionState {
  connected: boolean;
  areas_detected: DetectedAreaState;
  damages: Array<{
    type: string;
    description: string;
    severity: string;
    location: string;
    timestamp: number;
  }>;
  odometer?: { value: number; unit: string };
  fuel_level?: { percentage: number };
  last_message: string;
  events: LiveAnalysisEvent[];
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Gemini Live Service
 *
 * Manages real-time WebSocket connection to Gemini Live API for
 * live video inspection analysis.
 *
 * Features:
 * - Direct WebSocket connection to Gemini
 * - Sends video frames at 1 FPS
 * - Receives real-time analysis feedback
 * - Tracks detected areas and damages
 */
@Injectable({
  providedIn: 'root',
})
export class GeminiLiveService {
  private readonly supabaseClient = inject(SupabaseClientService).getClient();
  private readonly logger = inject(LoggerService);

  private websocket: WebSocket | null = null;
  private config: GeminiLiveConfig | null = null;
  private frameInterval: ReturnType<typeof setInterval> | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;

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

  readonly damages = signal<LiveInspectionState['damages']>([]);
  readonly odometer = signal<{ value: number; unit: string } | null>(null);
  readonly fuelLevel = signal<{ percentage: number } | null>(null);

  readonly detectedAreasCount = computed(() => {
    const areas = this.areasDetected();
    return Object.values(areas).filter(Boolean).length;
  });

  readonly missingAreas = computed(() => {
    const areas = this.areasDetected();
    const required: (keyof DetectedAreaState)[] = ['front', 'rear', 'left_side', 'right_side'];
    const labels: Record<keyof DetectedAreaState, string> = {
      front: 'Frente',
      rear: 'Trasera',
      left_side: 'Lateral Izquierdo',
      right_side: 'Lateral Derecho',
      interior: 'Interior',
      dashboard: 'Tablero',
      trunk: 'Maletero',
    };
    return required.filter(area => !areas[area]).map(area => labels[area]);
  });

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Initialize connection to Gemini Live API
   */
  connect(): Observable<boolean> {
    if (this.connectionState() === 'connected' || this.connectionState() === 'connecting') {
      return of(true);
    }

    this.connectionState.set('connecting');

    return this.fetchConfig().pipe(
      switchMap((config) => {
        this.config = config;
        return this.establishWebSocket(config);
      }),
      tap(() => {
        this.connectionState.set('connected');
        this.emitEvent({
          type: 'connected',
          message: 'Conexión establecida con IA',
          timestamp: Date.now(),
        });
      }),
      catchError((error) => {
        this.logger.error('Failed to connect to Gemini Live', 'GeminiLive', error);
        this.connectionState.set('error');
        this.emitEvent({
          type: 'error',
          message: 'Error al conectar con IA',
          timestamp: Date.now(),
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Disconnect from Gemini Live API
   */
  disconnect(): void {
    this.stopFrameCapture();

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.connectionState.set('disconnected');
    this.emitEvent({
      type: 'disconnected',
      message: 'Desconectado de IA',
      timestamp: Date.now(),
    });

    // Reset state
    this.resetState();
  }

  /**
   * Reset all state
   */
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
    this.damages.set([]);
    this.odometer.set(null);
    this.fuelLevel.set(null);
    this.lastMessage.set('');
  }

  // ============================================================================
  // CONFIG & WEBSOCKET
  // ============================================================================

  private fetchConfig(): Observable<GeminiLiveConfig> {
    return from(
      this.supabaseClient.functions.invoke<GeminiLiveConfig>('gemini-live-config')
    ).pipe(
      switchMap((response) => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        if (!response.data) {
          throw new Error('No config received');
        }
        return of(response.data);
      })
    );
  }

  private establishWebSocket(config: GeminiLiveConfig): Observable<boolean> {
    return new Observable((observer) => {
      try {
        this.websocket = new WebSocket(config.websocket_url);

        this.websocket.onopen = () => {
          this.logger.info('WebSocket connected', 'GeminiLive');
          // Send setup message
          this.sendSetupMessage(config);
        };

        this.websocket.onmessage = (event) => {
          this.handleServerMessage(event.data);
        };

        this.websocket.onerror = (error) => {
          this.logger.error('WebSocket error', 'GeminiLive', error);
          observer.error(new Error('WebSocket connection failed'));
        };

        this.websocket.onclose = (event) => {
          this.logger.info(`WebSocket closed: ${event.code}`, 'GeminiLive');
          if (this.connectionState() === 'connecting') {
            observer.error(new Error('Connection closed during setup'));
          }
        };

        // Wait for setup complete (handled in message handler)
        // For now, resolve after a short delay to allow setup
        setTimeout(() => {
          if (this.websocket?.readyState === WebSocket.OPEN) {
            observer.next(true);
            observer.complete();
          } else {
            observer.error(new Error('WebSocket not ready'));
          }
        }, 1000);
      } catch (error) {
        observer.error(error);
      }
    });
  }

  private sendSetupMessage(config: GeminiLiveConfig): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      this.logger.error('Cannot send setup - WebSocket not ready', 'GeminiLive');
      return;
    }

    const setupMessage = {
      setup: {
        model: config.model,
        generation_config: {
          response_modalities: ['TEXT'],
        },
        system_instruction: {
          parts: [{ text: config.system_prompt }],
        },
      },
    };

    this.websocket.send(JSON.stringify(setupMessage));
    this.logger.info('Setup message sent', 'GeminiLive');
  }

  // ============================================================================
  // VIDEO FRAME STREAMING
  // ============================================================================

  /**
   * Start capturing and sending video frames at 1 FPS
   */
  startFrameCapture(videoElement: HTMLVideoElement): void {
    if (!this.isConnected()) {
      this.logger.warn('Cannot start capture - not connected', 'GeminiLive');
      return;
    }

    this.videoElement = videoElement;

    // Create canvas for frame capture
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640; // Reduced resolution for bandwidth
    this.canvas.height = 480;
    this.canvasCtx = this.canvas.getContext('2d');

    if (!this.canvasCtx) {
      this.logger.error('Cannot get canvas context', 'GeminiLive');
      return;
    }

    // Capture and send frame every 1 second (1 FPS - Gemini Live limit)
    this.frameInterval = setInterval(() => {
      this.captureAndSendFrame();
    }, 1000);

    this.logger.info('Frame capture started at 1 FPS', 'GeminiLive');
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
    this.logger.info('Frame capture stopped', 'GeminiLive');
  }

  private captureAndSendFrame(): void {
    if (!this.videoElement || !this.canvas || !this.canvasCtx || !this.websocket) {
      return;
    }

    if (this.websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    // Draw current video frame to canvas
    this.canvasCtx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);

    // Convert to base64 JPEG
    const dataUrl = this.canvas.toDataURL('image/jpeg', 0.7);
    const base64Data = dataUrl.split(',')[1];

    // Send frame as realtimeInput
    const message = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'image/jpeg',
            data: base64Data,
          },
        ],
      },
    };

    this.websocket.send(JSON.stringify(message));
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  private handleServerMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      this.logger.debug('Received message', 'GeminiLive', message);

      // Handle setup complete
      if (message.setupComplete) {
        this.logger.info('Setup complete', 'GeminiLive');
        return;
      }

      // Handle server content (text responses)
      if (message.serverContent) {
        const parts = message.serverContent.modelTurn?.parts || [];
        for (const part of parts) {
          if (part.text) {
            this.processTextResponse(part.text);
          }
        }
      }

      // Handle errors
      if (message.error) {
        this.logger.error('Server error', 'GeminiLive', message.error);
        this.emitEvent({
          type: 'error',
          message: message.error.message || 'Error del servidor',
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      this.logger.error('Failed to parse message', 'GeminiLive', error);
    }
  }

  private processTextResponse(text: string): void {
    this.lastMessage.set(text);

    // Parse the response to extract structured data
    const event = this.parseAnalysisText(text);
    this.emitEvent(event);

    // Update state based on event type
    this.updateStateFromEvent(event);
  }

  private parseAnalysisText(text: string): LiveAnalysisEvent {
    const lowerText = text.toLowerCase();
    const timestamp = Date.now();

    // Detect area mentions
    const areaKeywords: Record<string, keyof DetectedAreaState> = {
      'frente': 'front',
      'frontal': 'front',
      'capot': 'front',
      'trasera': 'rear',
      'trasero': 'rear',
      'baúl': 'rear',
      'lateral izquierdo': 'left_side',
      'lado izquierdo': 'left_side',
      'lateral derecho': 'right_side',
      'lado derecho': 'right_side',
      'interior': 'interior',
      'asientos': 'interior',
      'tablero': 'dashboard',
      'odómetro': 'dashboard',
      'combustible': 'dashboard',
      'maletero': 'trunk',
    };

    for (const [keyword, area] of Object.entries(areaKeywords)) {
      if (lowerText.includes(keyword)) {
        return {
          type: 'area_detected',
          message: text,
          data: { area },
          timestamp,
        };
      }
    }

    // Detect damage mentions
    const damageKeywords = ['rayón', 'rayon', 'abolladura', 'grieta', 'mancha', 'daño', 'detecté', 'encontré'];
    for (const keyword of damageKeywords) {
      if (lowerText.includes(keyword)) {
        // Try to extract damage details from text
        const damage = this.extractDamageFromText(text);
        return {
          type: 'damage_found',
          message: text,
          data: { damage },
          timestamp,
        };
      }
    }

    // Detect odometer reading
    const odometerMatch = text.match(/odómetro[:\s]*([0-9.,]+)\s*(km|mi)?/i);
    if (odometerMatch) {
      const value = parseInt(odometerMatch[1].replace(/[.,]/g, ''), 10);
      const unit = odometerMatch[2]?.toLowerCase() || 'km';
      return {
        type: 'odometer_read',
        message: text,
        data: { odometer: { value, unit } },
        timestamp,
      };
    }

    // Detect fuel level
    const fuelMatch = text.match(/combustible[:\s]*(?:aproximadamente\s*)?([0-9]+)\s*%/i);
    if (fuelMatch) {
      const percentage = parseInt(fuelMatch[1], 10);
      return {
        type: 'fuel_read',
        message: text,
        data: { fuel_level: { percentage } },
        timestamp,
      };
    }

    // Detect guidance (instructions to user)
    const guidanceKeywords = ['mostrá', 'muestra', 'ahora', 'falta', 'necesito ver', 'por favor'];
    for (const keyword of guidanceKeywords) {
      if (lowerText.includes(keyword)) {
        return {
          type: 'guidance',
          message: text,
          timestamp,
        };
      }
    }

    // Default: generic text
    return {
      type: 'text',
      message: text,
      timestamp,
    };
  }

  private extractDamageFromText(text: string): {
    type: string;
    description: string;
    severity: string;
    location: string;
  } {
    const lowerText = text.toLowerCase();

    // Determine damage type
    let type = 'other';
    if (lowerText.includes('rayón') || lowerText.includes('rayon')) type = 'scratch';
    else if (lowerText.includes('abolladura')) type = 'dent';
    else if (lowerText.includes('grieta')) type = 'crack';
    else if (lowerText.includes('mancha')) type = 'stain';
    else if (lowerText.includes('faltante') || lowerText.includes('falta')) type = 'missing';

    // Determine severity
    let severity = 'minor';
    if (lowerText.includes('severo') || lowerText.includes('grave')) severity = 'severe';
    else if (lowerText.includes('moderado') || lowerText.includes('moderada')) severity = 'moderate';
    else if (lowerText.includes('menor') || lowerText.includes('leve')) severity = 'minor';

    // Try to extract location
    const locationPatterns = [
      /en (?:la |el )?(puerta[^,.]+)/i,
      /en (?:la |el )?(parachoques[^,.]+)/i,
      /en (?:la |el )?(capot[^,.]*)/i,
      /en (?:la |el )?(lateral[^,.]+)/i,
      /(puerta\s+(?:delantera|trasera)\s+(?:izquierda|derecha))/i,
    ];

    let location = 'ubicación no especificada';
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        location = match[1].trim();
        break;
      }
    }

    return {
      type,
      description: text,
      severity,
      location,
    };
  }

  private updateStateFromEvent(event: LiveAnalysisEvent): void {
    switch (event.type) {
      case 'area_detected':
        if (event.data?.area) {
          const areaKey = event.data.area as keyof DetectedAreaState;
          this.areasDetected.update(areas => ({
            ...areas,
            [areaKey]: true,
          }));
        }
        break;

      case 'damage_found':
        if (event.data?.damage) {
          this.damages.update(damages => [
            ...damages,
            {
              ...event.data!.damage!,
              timestamp: event.timestamp,
            },
          ]);
        }
        break;

      case 'odometer_read':
        if (event.data?.odometer) {
          this.odometer.set(event.data.odometer);
        }
        break;

      case 'fuel_read':
        if (event.data?.fuel_level) {
          this.fuelLevel.set(event.data.fuel_level);
        }
        break;
    }
  }

  private emitEvent(event: LiveAnalysisEvent): void {
    this.eventsSubject.next(event);
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Send a text message to Gemini
   */
  sendTextMessage(text: string): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      this.logger.warn('Cannot send message - not connected', 'GeminiLive');
      return;
    }

    const message = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    };

    this.websocket.send(JSON.stringify(message));
  }

  /**
   * Get current inspection state
   */
  getInspectionState(): LiveInspectionState {
    return {
      connected: this.isConnected(),
      areas_detected: this.areasDetected(),
      damages: this.damages(),
      odometer: this.odometer() || undefined,
      fuel_level: this.fuelLevel() || undefined,
      last_message: this.lastMessage(),
      events: [], // Events are streamed, not stored
    };
  }
}
