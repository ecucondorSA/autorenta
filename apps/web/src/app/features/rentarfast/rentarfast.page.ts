import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ChatMessage,
  ChatSuggestion,
  RentarfastAgentService,
} from '@core/services/ai/rentarfast-agent.service';
import { ProfileStore } from '@core/stores/profile.store';
import { RentarfastIntentService } from './services/rentarfast-intent.service';
import { CapabilityAction, RentarfastCapabilityService } from './services/rentarfast-capability.service';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

@Component({
  selector: 'app-rentarfast-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rentarfast.page.html',
  styleUrls: ['./rentarfast.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentarfastPage implements AfterViewChecked, OnDestroy {
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly profileStore = inject(ProfileStore);

  readonly agentService = inject(RentarfastAgentService);
  private readonly intentService = inject(RentarfastIntentService);
  private readonly capabilityService = inject(RentarfastCapabilityService);

  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') messageInput?: ElementRef<HTMLInputElement>;

  readonly messages = this.agentService.messages;
  readonly isLoading = this.agentService.isLoading;
  readonly inputText = signal('');

  // Voice recognition state
  readonly isListening = signal(false);
  readonly voiceSupported = signal(false);

  private lastVoiceErrorAt = 0;
  private voiceStartInFlight = false;
  private recognition: SpeechRecognition | null = null;
  private shouldScrollToBottom = false;
  private lastSanitizedMessageId: string | null = null;

  constructor() {
    this.initVoiceRecognition();
    void this.profileStore.loadProfile();

    // Effect: Override Ecuador responses when user is in Argentina
    effect(() => {
      const msgs = this.messages();
      const last = msgs[msgs.length - 1];
      if (!last || last.role !== 'agent') return;
      if (this.lastSanitizedMessageId === last.id) return;
      if (!this.shouldOverrideEcuadorResponse(last.content)) return;

      const replacement = [
        'Gracias por la aclaración.',
        'Voy a usar tu ubicación actual (o la última que me diste) para ordenar por distancia.',
        'Si querés, también podés indicarme fechas para filtrar disponibilidad exacta.',
      ].join(' ');

      this.agentService.updateMessageContent(last.id, replacement, [
        ...(last.toolsUsed ?? []),
        'local_override',
      ]);
      this.lastSanitizedMessageId = last.id;
    });
  }

  // ============================================
  // Voice Recognition
  // ============================================

  private initVoiceRecognition(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      this.voiceSupported.set(true);
      this.recognition = new SpeechRecognitionAPI();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'es-ES';

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          this.inputText.set(finalTranscript);
          setTimeout(() => this.sendMessage(), 300);
        } else if (interimTranscript) {
          this.inputText.set(interimTranscript);
        }
      };

      this.recognition.onerror = (event: Event) => {
        this.isListening.set(false);
        this.voiceStartInFlight = false;
        this.notifyVoiceError(event);
      };

      this.recognition.onend = () => {
        this.isListening.set(false);
        this.voiceStartInFlight = false;
      };

      this.recognition.onstart = () => {
        this.isListening.set(true);
        this.voiceStartInFlight = false;
      };
    }
  }

  toggleVoice(): void {
    if (this.isListening()) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  startListening(): void {
    if (this.isLoading()) {
      this.agentService.addLocalAgentMessage(
        'Estoy procesando tu último mensaje. Apenas termino, tocá el micrófono y hablá.',
        ['local_voice'],
      );
      return;
    }
    if (!this.recognition) {
      this.agentService.addLocalAgentMessage(
        'Tu navegador no habilitó el reconocimiento de voz. Podés escribir o probar en Chrome/Edge y aceptar permisos de micrófono.',
        ['local_voice'],
      );
      return;
    }

    if (this.isListening() || this.voiceStartInFlight) {
      this.agentService.addLocalAgentMessage('Ya estoy escuchando. Hablame ahora.', ['local_voice']);
      return;
    }

    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      this.inputText.set('');
      this.voiceStartInFlight = true;
      this.recognition.start();
    } catch (err) {
      this.voiceStartInFlight = false;
      this.notifyVoiceError(err);
    }
  }

  stopListening(): void {
    if (!this.recognition) return;

    try {
      this.recognition.stop();
    } catch {
      // Not listening
    }
    this.isListening.set(false);
    this.voiceStartInFlight = false;
  }

  private notifyVoiceError(err: unknown): void {
    const now = Date.now();
    if (now - this.lastVoiceErrorAt < 1500) return;
    this.lastVoiceErrorAt = now;

    const message =
      typeof err === 'string' ? err :
      err instanceof Error ? err.message :
      (err as { error?: string })?.error ? String((err as { error?: string }).error) : null;

    const lowerMessage = message?.toLowerCase() ?? '';

    if (lowerMessage.includes('recognition has already started')) {
      this.agentService.addLocalAgentMessage('Ya estoy escuchando. Hablame ahora.', ['local_voice']);
      return;
    }

    if (lowerMessage.includes('no-speech')) {
      this.agentService.addLocalAgentMessage(
        'No detecté tu voz. Tocá el micrófono y hablá más cerca del dispositivo.',
        ['local_voice'],
      );
      return;
    }

    if (lowerMessage.includes('aborted') || lowerMessage.includes('cancelled')) {
      return;
    }

    if (lowerMessage.includes('audio-capture') || lowerMessage.includes('not-allowed')) {
      this.agentService.addLocalAgentMessage(
        'No tengo acceso al micrófono. Habilitá el permiso en tu navegador y recargá la página.',
        ['local_voice'],
      );
      return;
    }

    if (lowerMessage.includes('network') || lowerMessage.includes('service-not-allowed')) {
      this.agentService.addLocalAgentMessage(
        'Error de conexión con el servicio de voz. Verificá tu conexión a internet.',
        ['local_voice'],
      );
      return;
    }

    const hint = 'No pude activar el micrófono. Revisá permisos del navegador y que estés en HTTPS (o localhost).';
    this.agentService.addLocalAgentMessage(message ? `${hint} Detalle: ${message}` : hint, ['local_voice']);
  }

  // ============================================
  // Messaging
  // ============================================

  async sendMessage(): Promise<void> {
    const text = this.inputText().trim();
    if (!text || this.isLoading()) return;

    this.stopListening();
    this.inputText.set('');
    this.shouldScrollToBottom = true;

    // Check for voice help query
    if (this.isVoiceHelpQuery(text)) {
      await this.respondWithVoiceHelp(text);
      this.shouldScrollToBottom = true;
      return;
    }

    // Check for "book first car" intent
    if (this.isBookFirstCarQuery(text)) {
      await this.capabilityService.bookFirstCar(text);
      this.shouldScrollToBottom = true;
      return;
    }

    // Try local intent handlers
    const intentResult = await this.intentService.tryHandleLocalIntent(text);
    if (intentResult.handled) {
      if (intentResult.scrollToBottom) {
        this.shouldScrollToBottom = true;
      }
      return;
    }

    // Build context and send to AI agent
    const context = await this.intentService.buildChatContext(text);

    if (this.agentService.isConnected()) {
      this.agentService.sendMessageRealtimeWithContext(text, context);
      this.shouldScrollToBottom = true;
      return;
    }

    // Fallback to HTTP
    this.agentService
      .sendMessage(text, context)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.shouldScrollToBottom = true;
        },
        error: (err) => {
          this.logger.error('[Rentarfast] Error sending message', err);
        },
      });
  }

  private isVoiceHelpQuery(text: string): boolean {
    const normalized = this.intentService.normalizeInput(text);
    return /(no me escuch|no me entiende|no estas escuch|no est[aá]s escuch|microfono|micr[oó]fono|voz no funciona|no anda la voz)/.test(normalized);
  }

  private isBookFirstCarQuery(text: string): boolean {
    // If message contains a UUID, it's a specific car request - let AI agent handle it
    if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(text)) {
      return false;
    }
    const normalized = this.intentService.normalizeInput(text);
    // More specific pattern: only match "1" or "1ro" as standalone words for "first"
    return /(alquilar|reservar|rentar).*(primero|primer auto|primera opcion|el 1\b|el 1ro)/.test(normalized);
  }

  private async respondWithVoiceHelp(originalText: string): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);

    if (!this.voiceSupported()) {
      this.agentService.addLocalAgentMessage(
        [
          'En este dispositivo/navegador no está disponible el reconocimiento de voz.',
          'Probá con Chrome/Edge (Android/desktop) y aceptá el permiso de micrófono.',
          'Mientras tanto, podés escribirme acá mismo.',
        ].join(' '),
        ['local_voice'],
      );
      return;
    }

    if (this.isLoading()) {
      this.agentService.addLocalAgentMessage(
        'Estoy procesando tu último mensaje. Apenas termino, tocá el micrófono y hablá.',
        ['local_voice'],
      );
      return;
    }

    this.agentService.addLocalAgentMessage(
      [
        'Para hablarme: tocá el botón del micrófono y empezá a hablar.',
        'Si no arranca, el navegador puede estar bloqueando permisos de micrófono.',
        'Probá: permitir micrófono en el candadito del navegador y recargar la página.',
      ].join(' '),
      ['local_voice'],
    );
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    this.agentService.clearHistory();
  }

  // ============================================
  // Capability Buttons
  // ============================================

  onCapabilityClick(action: CapabilityAction): void {
    this.shouldScrollToBottom = true;
    void this.capabilityService.onCapabilityClick(action);
  }

  // ============================================
  // Suggestion Buttons (estilo Supabase)
  // ============================================

  onSuggestionClick(suggestion: ChatSuggestion): void {
    this.shouldScrollToBottom = true;
    this.inputText.set(suggestion.action);
    // Ejecutar inmediatamente
    setTimeout(() => this.sendMessage(), 100);
  }

  // ============================================
  // Navigation
  // ============================================

  goBack(): void {
    this.stopListening();
    this.router.navigate(['/']);
  }

  // ============================================
  // Lifecycle & Helpers
  // ============================================

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.stopListening();
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  private shouldOverrideEcuadorResponse(message: string): boolean {
    const lower = message.toLowerCase();
    const mentionsEcuador = /(ecuador|quito|guayaquil)/.test(lower);
    if (!mentionsEcuador) return false;

    const market = this.intentService.context.market;
    if (market?.country?.toLowerCase() === 'ar') return true;
    if (market?.city?.toLowerCase().includes('buenos')) return true;

    const profile = this.profileStore.profile();
    if (profile?.country?.toLowerCase() === 'ar') return true;
    if (profile?.city?.toLowerCase()?.includes('buenos')) return true;

    const locale = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : '';
    const timezone = typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone.toLowerCase()
      : '';

    if (locale.startsWith('es-ar')) return true;
    if (timezone.includes('argentina') || timezone.includes('buenos_aires')) return true;

    return false;
  }
}
