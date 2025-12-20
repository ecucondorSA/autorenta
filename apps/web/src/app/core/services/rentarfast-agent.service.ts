import { Injectable, inject, signal, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

export interface UserLocation {
  lat: number;
  lng: number;
  city?: string;
  address?: string;
  source?: 'home' | 'gps' | 'address';
  accuracy?: number;
}

export interface UserProfileContext {
  id?: string;
  email?: string;
  full_name?: string;
  role?: string;
  city?: string | null;
  country?: string | null;
  kyc?: string;
  can_publish_cars?: boolean;
  can_book_cars?: boolean;
}

export interface ChatContext {
  userLocation?: UserLocation;
  userProfile?: UserProfileContext;
  auth?: {
    userId?: string;
    email?: string;
    isAuthenticated?: boolean;
  };
  locale?: string;
  currency?: string;
  timezone?: string;
  market?: {
    country?: string;
    city?: string;
  };
  rentalPreferences?: {
    pickup?: 'owner_address' | 'office' | 'airport' | 'custom';
    dropoff?: 'owner_address' | 'office' | 'airport' | 'custom';
    sameLocation?: boolean;
    addressHint?: string;
  };
}

export interface AgentChatRequest {
  message: string;
  sessionId?: string;
  context?: ChatContext;
}

export interface AgentChatResponse {
  success: boolean;
  response: string;
  sessionId: string;
  toolsUsed: string[];
  timestamp: string;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  toolsUsed?: string[];
  isStreaming?: boolean;
}

export interface TranscriptionEvent {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export interface AgentResponseEvent {
  text: string;
  sessionId: string;
  toolsUsed: string[];
  language: string;
}

export interface TTSChunkEvent {
  audio: string; // base64
  index: number;
  isLast: boolean;
  provider: string;
}

@Injectable({ providedIn: 'root' })
export class RentarfastAgentService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);

  private readonly API_URL = 'https://autorenta-agent-1029437966017.us-central1.run.app';

  // Socket.IO connection
  private socket: Socket | null = null;

  // Session management
  private readonly _sessionId = signal<string | null>(null);
  readonly sessionId = this._sessionId.asReadonly();

  // Chat history
  private readonly _messages = signal<ChatMessage[]>([]);
  readonly messages = this._messages.asReadonly();

  // Loading state
  private readonly _isLoading = signal(false);
  readonly isLoading = this._isLoading.asReadonly();

  // Connection state
  private readonly _isConnected = signal(false);
  readonly isConnected = this._isConnected.asReadonly();

  // Real-time events
  private readonly transcriptionSubject = new Subject<TranscriptionEvent>();
  readonly transcription$ = this.transcriptionSubject.asObservable();

  private readonly ttsChunkSubject = new Subject<TTSChunkEvent>();
  readonly ttsChunk$ = this.ttsChunkSubject.asObservable();

  // Audio playback queue
  private audioQueue: string[] = [];
  private isPlayingAudio = false;
  private audioContext: AudioContext | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeSocket();
    }
  }

  /**
   * Initialize Socket.IO connection for real-time communication
   */
  private initializeSocket(): void {
    this.socket = io(this.API_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.ngZone.run(() => {
        this._isConnected.set(true);
        console.log('[Rentarfast] WebSocket connected');
      });
    });

    this.socket.on('disconnect', () => {
      this.ngZone.run(() => {
        this._isConnected.set(false);
        console.log('[Rentarfast] WebSocket disconnected');
      });
    });

    // Transcription events (real-time STT)
    this.socket.on('transcription', (data: TranscriptionEvent) => {
      this.ngZone.run(() => {
        this.transcriptionSubject.next(data);
      });
    });

    // Agent response (text)
    this.socket.on('agent_response', (data: AgentResponseEvent) => {
      this.ngZone.run(() => {
        this._sessionId.set(data.sessionId);

        // Add agent message
        const agentMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'agent',
          content: data.text,
          timestamp: new Date(),
          toolsUsed: data.toolsUsed,
        };
        this._messages.update(msgs => [...msgs, agentMessage]);
        this._isLoading.set(false);
      });
    });

    // TTS audio chunks for streaming playback
    this.socket.on('tts_chunk', (data: TTSChunkEvent) => {
      this.ngZone.run(() => {
        this.ttsChunkSubject.next(data);
        this.queueAudioChunk(data.audio);
      });
    });

    this.socket.on('tts_end', () => {
      // All audio chunks received
    });

    this.socket.on('processing_start', () => {
      this.ngZone.run(() => {
        this._isLoading.set(true);
      });
    });

    this.socket.on('processing_end', () => {
      this.ngZone.run(() => {
        this._isLoading.set(false);
      });
    });

    this.socket.on('error', (error: { type: string; message: string }) => {
      console.error('[Rentarfast] Error:', error);
      this.ngZone.run(() => {
        this._isLoading.set(false);
      });
    });

    this.socket.on('recording_started', () => {
      console.log('[Rentarfast] Recording started');
    });
  }

  /**
   * Queue audio chunk for playback
   */
  private queueAudioChunk(base64Audio: string): void {
    this.audioQueue.push(base64Audio);
    if (!this.isPlayingAudio) {
      this.playNextAudioChunk();
    }
  }

  /**
   * Play next audio chunk in queue
   */
  private async playNextAudioChunk(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlayingAudio = false;
      return;
    }

    this.isPlayingAudio = true;
    const base64Audio = this.audioQueue.shift()!;

    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.onended = () => {
        this.playNextAudioChunk();
      };
      source.start();
    } catch (error) {
      console.error('[Rentarfast] Audio playback error:', error);
      this.playNextAudioChunk();
    }
  }

  /**
   * Send a message via WebSocket (real-time)
   */
  sendMessageRealtime(message: string): void {
    if (!this.socket?.connected) {
      console.warn('[Rentarfast] WebSocket not connected, falling back to HTTP');
      this.sendMessage(message).subscribe();
      return;
    }

    this._isLoading.set(true);

    // Add user message to history
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    this._messages.update(msgs => [...msgs, userMessage]);

    // Send via WebSocket
    this.socket.emit('send_message', {
      message,
      sessionId: this._sessionId(),
    });
  }

  sendMessageRealtimeWithContext(message: string, context?: ChatContext): void {
    if (!this.socket?.connected) {
      console.warn('[Rentarfast] WebSocket not connected, falling back to HTTP');
      this.sendMessage(message, context).subscribe();
      return;
    }

    this._isLoading.set(true);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    this._messages.update(msgs => [...msgs, userMessage]);

    this.socket.emit('send_message', {
      message,
      sessionId: this._sessionId(),
      context,
    });
  }

  addLocalAgentMessage(content: string, toolsUsed: string[] = []): string {
    const agentMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'agent',
      content,
      timestamp: new Date(),
      toolsUsed,
    };
    this._messages.update(msgs => [...msgs, agentMessage]);
    return agentMessage.id;
  }

  addLocalUserMessage(content: string): string {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    this._messages.update(msgs => [...msgs, userMessage]);
    return userMessage.id;
  }

  updateMessageContent(messageId: string, content: string, toolsUsed?: string[]): void {
    this._messages.update(msgs =>
      msgs.map((msg) =>
        msg.id === messageId
          ? {
            ...msg,
            content,
            toolsUsed: toolsUsed ?? msg.toolsUsed,
          }
          : msg,
      ),
    );
  }

  /**
   * Start voice recording for real-time transcription
   */
  startRecording(): void {
    if (!this.socket?.connected) {
      console.warn('[Rentarfast] WebSocket not connected');
      return;
    }

    this.socket.emit('start_recording', {
      sessionId: this._sessionId(),
    });
  }

  /**
   * Send audio chunk for real-time transcription
   */
  sendAudioChunk(audioData: ArrayBuffer): void {
    if (!this.socket?.connected) return;
    this.socket.emit('audio_chunk', audioData);
  }

  /**
   * Stop voice recording
   */
  stopRecording(): void {
    if (!this.socket?.connected) return;
    this.socket.emit('stop_recording');
  }

  /**
   * Send a message via HTTP (fallback)
   */
  sendMessage(message: string, context?: ChatContext): Observable<AgentChatResponse> {
    this._isLoading.set(true);

    // Add user message to history
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    this._messages.update(msgs => [...msgs, userMessage]);

    const request: AgentChatRequest = {
      message,
      sessionId: this._sessionId() ?? undefined,
      context,
    };

    return this.http.post<AgentChatResponse>(`${this.API_URL}/api/chat`, request).pipe(
      tap(response => {
        // Update session ID if returned
        if (response.sessionId) {
          this._sessionId.set(response.sessionId);
        }

        // Add agent response to history
        const agentMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'agent',
          content: response.response,
          timestamp: new Date(),
          toolsUsed: response.toolsUsed,
        };
        this._messages.update(msgs => [...msgs, agentMessage]);
      }),
      catchError(error => {
        console.error('Rentarfast agent error:', error);

        // Add error message
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'agent',
          content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
          timestamp: new Date(),
        };
        this._messages.update(msgs => [...msgs, errorMessage]);

        return of({
          success: false,
          response: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
          sessionId: this._sessionId() ?? '',
          toolsUsed: [],
          timestamp: new Date().toISOString(),
          error: error.message,
        });
      }),
      tap(() => this._isLoading.set(false))
    );
  }

  /**
   * Clear chat history and start new session
   */
  clearHistory(): void {
    this._messages.set([]);
    this._sessionId.set(null);
    this.audioQueue = [];
  }

  /**
   * Get health status of the agent
   */
  healthCheck(): Observable<boolean> {
    return this.http.get<{ status: string }>(`${this.API_URL}/health`).pipe(
      map(response => response.status === 'ok'),
      catchError(() => of(false))
    );
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
