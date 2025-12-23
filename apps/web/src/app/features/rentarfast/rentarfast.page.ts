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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { WalletBalance } from '@core/models/wallet.model';
import {
  ChatContext,
  ChatMessage,
  RentarfastAgentService,
} from '@core/services/ai/rentarfast-agent.service';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { CarsService } from '@core/services/cars/cars.service';
import { GeocodingService } from '@core/services/geo/geocoding.service';
import { LocationData, LocationService } from '@core/services/geo/location.service';
import { WalletService } from '@core/services/payments/wallet.service';
import { VerificationService } from '@core/services/verification/verification.service';
import { ProfileStore } from '@core/stores/profile.store';

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
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly agentService = inject(RentarfastAgentService);
  private readonly locationService = inject(LocationService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly profileStore = inject(ProfileStore);
  private readonly authService = inject(AuthService);
  private readonly walletService = inject(WalletService);
  private readonly carsService = inject(CarsService);
  private readonly verificationService = inject(VerificationService);
  private readonly bookingsService = inject(BookingsService);
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') messageInput?: ElementRef<HTMLInputElement>;

  readonly messages = this.agentService.messages;
  readonly isLoading = this.agentService.isLoading;
  readonly inputText = signal('');
  private readonly lastLocation = signal<LocationData | null>(null);
  private readonly lastMarket = signal<{ country?: string; city?: string } | null>(null);
  private readonly lastSanitizedMessageId = signal<string | null>(null);
  private readonly lastUserText = signal<string>('');
  private readonly lastPickupPreference = signal<
    'owner_address' | 'office' | 'airport' | 'custom' | null
  >(null);
  private readonly lastDropoffPreference = signal<
    'owner_address' | 'office' | 'airport' | 'custom' | null
  >(null);
  private readonly lastAddressHint = signal<string | null>(null);
  private readonly locationOverrideKey = 'autorenta:location_override';

  // Voice recognition state
  readonly isListening = signal(false);
  readonly voiceSupported = signal(false);

  private lastVoiceErrorAt = 0;
  private voiceStartInFlight = false;

  private recognition: SpeechRecognition | null = null;
  private shouldScrollToBottom = false;

  constructor() {
    this.initVoiceRecognition();
    void this.profileStore.loadProfile();

    effect(() => {
      const msgs = this.messages();
      const last = msgs[msgs.length - 1];
      if (!last || last.role !== 'agent') return;
      if (this.lastSanitizedMessageId() === last.id) return;
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
      this.lastSanitizedMessageId.set(last.id);
    });

    effect(() => {
      const msgs = this.messages();
      const last = msgs[msgs.length - 1];
      if (!last || last.role !== 'agent') return;
      if (this.lastSanitizedMessageId() === last.id) return;
      if (!this.shouldOverrideConfusedResponse(last.content)) return;
      if (!this.isWalletQuery(this.lastUserText())) return;

      void this.overrideWithWalletSummary(last.id);
    });

    effect(() => {
      const msgs = this.messages();
      const last = msgs[msgs.length - 1];
      if (!last || last.role !== 'agent') return;
      if (this.lastSanitizedMessageId() === last.id) return;
      if (!this.isWalletQuery(this.lastUserText())) return;
      if (!this.shouldOverrideWalletLookup(last.content)) return;

      void this.overrideWithWalletSummary(last.id);
    });

    effect(() => {
      const msgs = this.messages();
      const last = msgs[msgs.length - 1];
      if (!last || last.role !== 'agent') return;
      if (this.lastSanitizedMessageId() === last.id) return;
      if (!this.isWalletQuery(this.lastUserText())) return;
      if (!this.shouldOverrideGreetingResponse(last.content)) return;

      void this.overrideWithWalletSummary(last.id);
    });
  }

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
          // Auto-send after voice input
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

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.stopListening();
  }

  goBack(): void {
    this.stopListening();
    this.router.navigate(['/']);
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
      // Evitar el error: "recognition has already started"
      this.agentService.addLocalAgentMessage('Ya estoy escuchando. Hablame ahora.', [
        'local_voice',
      ]);
      return;
    }

    try {
      // Haptic feedback
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

  async sendMessage(): Promise<void> {
    const text = this.inputText().trim();
    if (!text || this.isLoading()) return;

    this.stopListening();
    this.inputText.set('');
    this.shouldScrollToBottom = true;
    this.lastUserText.set(text);

    if (await this.tryHandleLocalIntent(text)) {
      this.shouldScrollToBottom = true;
      return;
    }

    const context = await this.buildChatContext(text);

    // Use WebSocket real-time if connected, otherwise HTTP fallback
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
          console.error('Error sending message:', err);
        },
      });
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

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  private async tryHandleLocalIntent(text: string): Promise<boolean> {
    const normalized = this.normalizeInput(text);

    if (
      /(no me escuch|no me entiende|no estas escuch|no est[aá]s escuch|microfono|micr[oó]fono|voz no funciona|no anda la voz)/.test(
        normalized,
      )
    ) {
      await this.respondWithVoiceHelp(text);
      return true;
    }

    if (/(publicar|publica|subir).*(auto|veh[ií]culo)/.test(normalized)) {
      this.agentService.addLocalUserMessage(text);
      this.agentService.addLocalAgentMessage('Listo, te llevo a publicar tu auto.', [
        'local_navigation',
      ]);
      this.router.navigate(['/cars/publish']);
      return true;
    }

    if (
      /(crear|hacer|iniciar).*(reserva|reservar)/.test(normalized) ||
      /(buscar|alquilar|rentar).*(auto|veh[ií]culo)/.test(normalized)
    ) {
      // ✅ Si el usuario ya aportó carId + fechas, crear la reserva con su sesión.
      const command = this.parseBookingCommand(text);
      if (command) {
        await this.createBookingFromCommand(text, command);
        return true;
      }

      // Fallback: navegación al flujo estándar (selección de auto + fechas)
      this.agentService.addLocalUserMessage(text);
      this.agentService.addLocalAgentMessage(
        'Te llevo a buscar autos disponibles. Ahí podés elegir fechas y reservar.',
        ['local_navigation'],
      );
      this.router.navigate(['/cars/list']);
      return true;
    }

    if (
      /(mis reservas|mis reservaciones|estado de mis reservas|estado de reservas)/.test(normalized)
    ) {
      this.agentService.addLocalUserMessage(text);
      this.agentService.addLocalAgentMessage('Te llevo a tus reservas.', ['local_navigation']);
      this.router.navigate(['/bookings']);
      return true;
    }

    if (/(mi cuenta|mi perfil|perfil)/.test(normalized)) {
      this.agentService.addLocalUserMessage(text);
      this.agentService.addLocalAgentMessage('Abriendo tu perfil.', ['local_navigation']);
      this.router.navigate(['/profile']);
      return true;
    }

    if (
      /(herramientas|que puedes hacer|qué puedes hacer|que podes hacer|qué podés hacer|capacidades)/.test(
        normalized,
      )
    ) {
      await this.respondWithToolsSummary(text);
      return true;
    }

    if (this.wantsCurrentLocation(normalized)) {
      this.agentService.addLocalUserMessage(text);
      const location = await this.locationService.getLocationByChoice('current');
      if (location) {
        this.lastLocation.set(location);

        // Buscar el auto más cercano automáticamente
        const nearestCarInfo = await this.getNearestCarInfo(location.lat, location.lng);

        const locationText = location.address
          ? `Tu ubicación es: ${location.address}.`
          : 'Tomé tu ubicación.';

        const response = nearestCarInfo
          ? `${locationText} ${nearestCarInfo}`
          : locationText;

        this.agentService.addLocalAgentMessage(response, ['local_location']);
      } else {
        const home = await this.locationService.getHomeLocation();
        if (home) {
          this.lastLocation.set(home);
          const nearestCarInfo = await this.getNearestCarInfo(home.lat, home.lng);
          const locationText = home.address
            ? `Uso tu ubicación guardada: ${home.address}.`
            : 'Uso tu ubicación guardada.';
          const response = nearestCarInfo
            ? `${locationText} ${nearestCarInfo}`
            : locationText;
          this.agentService.addLocalAgentMessage(response, ['local_location']);
        } else {
          this.agentService.addLocalAgentMessage(
            'No pude acceder a tu ubicación. ¿Podés habilitar permisos o decirme una dirección?',
            ['local_location'],
          );
        }
      }
      return true;
    }

    if (this.looksLikeAddress(normalized)) {
      this.agentService.addLocalUserMessage(text);
      const location = await this.resolveLocationContext(text);
      if (location) {
        this.lastLocation.set(location);
        this.lastAddressHint.set(location.address ?? text);
        this.agentService.addLocalAgentMessage(
          location.address
            ? `Listo, tomaré esa ubicación: ${location.address}.`
            : 'Listo, tomaré esa ubicación.',
          ['local_location'],
        );
        return true;
      }
    }

    if (/(buenos aires)/.test(normalized)) {
      this.agentService.addLocalUserMessage(text);
      this.lastMarket.set({ country: 'AR', city: 'Buenos Aires' });
      this.agentService.addLocalAgentMessage(
        'Perfecto, usaré Buenos Aires, Argentina para las búsquedas.',
        ['local_location'],
      );
      return true;
    }

    if (/(argentina)/.test(normalized)) {
      this.agentService.addLocalUserMessage(text);
      this.lastMarket.set({ country: 'AR' });
      this.agentService.addLocalAgentMessage(
        'Perfecto, uso Argentina como país. Si querés, decime ciudad o uso tu ubicación actual para ordenar por distancia.',
        ['local_location'],
      );
      return true;
    }

    // Prioridad: preguntas sobre el auto más cercano → responder con detalles específicos
    // Incluye: "auto mas cerca", "auto mas cerca a mi", "cual es el mas cercano"
    if (
      /(cual|dime|diga|indica|indicame|indiqueme).*(mas cercan|cerca)/.test(normalized) ||
      /(el auto|un auto).*(mas cercan|cerca)/.test(normalized) ||
      /auto mas cerca/.test(normalized) ||
      /el mas cercano/.test(normalized)
    ) {
      await this.respondWithNearestCar(text);
      return true;
    }

    // Follow-up cortos: "cual es?", "indiqueme", "dime cual"
    // Funciona con o sin contexto de ubicación previo
    if (
      /^(cual es|cual|indiqueme|indicame|dime cual|dimelo|muestra|mostrame|cual seria)\??$/.test(normalized.trim())
    ) {
      await this.respondWithNearestCar(text);
      return true;
    }

    if (
      /(mi cuenta|mi perfil|quien soy|quién soy|estoy logueado|estoy logueada|mi usuario)/.test(
        normalized,
      )
    ) {
      await this.respondWithAccountSummary(text);
      return true;
    }

    const personalInfo = this.getPersonalInfoQueryKind(normalized);
    if (personalInfo) {
      await this.respondWithPersonalInfo(text, personalInfo);
      return true;
    }

    if (
      /(a que no tenes acceso|a que no tienes acceso|que no tenes acceso|que no tienes acceso|no tenes acceso|no tienes acceso|limitaciones|privacidad)/.test(
        normalized,
      )
    ) {
      await this.respondWithAccessLimitations(text);
      return true;
    }

    if (/(mi wallet|mi billetera|saldo|balance|saldo disponible)/.test(normalized)) {
      await this.respondWithWalletSummary(text);
      return true;
    }

    if (/(abrir|ver|ir a).*(wallet|billetera)/.test(normalized)) {
      this.agentService.addLocalUserMessage(text);
      this.agentService.addLocalAgentMessage('Abriendo tu wallet.', ['local_navigation']);
      this.router.navigate(['/wallet']);
      return true;
    }

    // Quick booking: "alquilar el primero" uses stored nearest car
    if (/(alquilar|reservar|rentar).*(primero|primer auto|primera opcion|1)/.test(normalized)) {
      await this.bookFirstCarCapability(text);
      return true;
    }

    if (/(mis autos|mis vehículos|mis vehiculos|mis coches)/.test(normalized)) {
      await this.respondWithMyCarsSummary(text);
      return true;
    }

    if (/(abrir|ver|ir a).*(mis autos|autos publicados|mis veh[ií]culos)/.test(normalized)) {
      this.agentService.addLocalUserMessage(text);
      this.agentService.addLocalAgentMessage('Abriendo tus autos.', ['local_navigation']);
      this.router.navigate(['/cars/my']);
      return true;
    }

    if (/(mis documentos|documentos|verificaci[oó]n|kyc|mi verificacion)/.test(normalized)) {
      await this.respondWithDocumentsSummary(text);
      return true;
    }

    if (/(autos?).*(cerca|cercanos|cercanas|m[aá]s cercanos|cerca de m[ií])/.test(normalized)) {
      await this.navigateToNearbyCars(text);
      return true;
    }

    if (/(abrir|ver|ir a).*(documentos|verificaci[oó]n)/.test(normalized)) {
      this.agentService.addLocalUserMessage(text);
      this.agentService.addLocalAgentMessage('Abriendo verificación.', ['local_navigation']);
      this.router.navigate(['/profile/verification']);
      return true;
    }

    const pickupPref = this.parsePickupPreference(normalized);
    if (pickupPref) {
      this.agentService.addLocalUserMessage(text);
      this.lastPickupPreference.set(pickupPref.pickup);
      this.lastDropoffPreference.set(pickupPref.dropoff ?? pickupPref.pickup);
      if (pickupPref.addressHint) {
        this.lastAddressHint.set(pickupPref.addressHint);
      }

      const locationText =
        pickupPref.pickup === 'owner_address'
          ? 'en la casa del dueño'
          : pickupPref.pickup === 'airport'
            ? 'en el aeropuerto'
            : pickupPref.pickup === 'office'
              ? 'en la oficina'
              : 'en la dirección indicada';

      const response = [
        `Perfecto: retiro y devolución ${locationText}.`,
        pickupPref.sameLocation
          ? 'Confirmo que devolvés en el mismo lugar.'
          : '¿Querés devolver en el mismo lugar?',
        pickupPref.pickup === 'owner_address'
          ? 'Si querés, indicame la dirección exacta o confirmo la del anuncio.'
          : 'Si querés, indicame la dirección exacta.',
      ].join(' ');

      this.agentService.addLocalAgentMessage(response, ['local_location']);
      return true;
    }

    return false;
  }

  private getPersonalInfoQueryKind(
    normalized: string,
  ): 'name' | 'email' | 'dni' | null {
    if (/(mi nombre|como me llamo|cu[aá]l es mi nombre)/.test(normalized)) return 'name';
    if (/(mi email|mi correo|mi mail|cu[aá]l es mi correo|cu[aá]l es mi email)/.test(normalized)) {
      return 'email';
    }
    if (/(mi dni|mi documento|n[uú]mero de documento|documento nacional)/.test(normalized)) {
      return 'dni';
    }
    return null;
  }

  private async respondWithPersonalInfo(
    originalText: string,
    kind: 'name' | 'email' | 'dni',
  ): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const auth = await this.getAuthSnapshot();
    if (!auth) {
      this.agentService.addLocalAgentMessage(
        'Para ver tus datos necesito que estés logueado. ¿Querés que abra el login?',
        ['local_profile'],
      );
      return;
    }

    let profile = this.profileStore.profile();
    if (!profile) {
      try {
        profile = await this.profileStore.loadProfile();
      } catch {
        profile = this.profileStore.profile();
      }
    }

    if (kind === 'email') {
      this.agentService.addLocalAgentMessage(
        auth.email
          ? `Tu email es: ${auth.email}.`
          : 'No tengo un email disponible en tu sesión. Podés revisarlo en tu perfil.',
        ['local_profile'],
      );
      return;
    }

    if (kind === 'name') {
      const name = profile?.full_name?.trim();
      this.agentService.addLocalAgentMessage(
        name
          ? `Tu nombre (según tu perfil) es: ${name}.`
          : 'No veo tu nombre cargado en el perfil. Si querés, abrimos tu perfil para completarlo.',
        ['local_profile'],
      );
      return;
    }

    const dniCandidate =
      profile?.gov_id_number ??
      (profile as unknown as { dni?: string | null }).dni ??
      null;

    if (!dniCandidate) {
      this.agentService.addLocalAgentMessage(
        'No tengo un DNI cargado/visible en tu perfil. Podés revisarlo o completarlo desde tu perfil.',
        ['local_profile'],
      );
      return;
    }

    this.agentService.addLocalAgentMessage(
      `DNI (enmascarado): ${this.maskSensitiveNumber(dniCandidate)}.`,
      ['local_profile'],
    );
  }

  private maskSensitiveNumber(value: string): string {
    const raw = String(value).trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 0) return '***';
    if (digits.length <= 3) return `***${digits}`;
    const tail = digits.slice(-3);
    return `***${tail}`;
  }

  private async respondWithAccessLimitations(originalText: string): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);

    const auth = await this.getAuthSnapshot();
    const canReadAccount = Boolean(auth);

    const response = [
      'Acceso que SÍ tengo dentro de la app:',
      canReadAccount
        ? '• Tus datos de sesión (tu ID y tu email si existe en la sesión).'
        : '• Solo datos generales (si no estás logueado, no puedo ver tu cuenta).',
      canReadAccount
        ? '• Tu perfil (por ejemplo nombre si está cargado).'
        : '• Autos públicos (marketplace) y navegación dentro de la app.',
      canReadAccount ? '• Tu wallet (saldos) y tus reservas.' : '• Búsqueda de autos y estimaciones sin cuenta.',
      '• Tu ubicación SOLO si das permiso al navegador o me das una dirección.',
      '',
      'Acceso que NO tengo:',
      '• Contraseñas o códigos de verificación.',
      '• Datos de pago completos (tarjetas completas, CVV).',
      '• Información personal de otros usuarios.',
      '• Datos que no estén cargados en tu perfil o que el backend no exponga al frontend.',
      '',
      'Si querés “programarme” para más personalización, la clave es exponer herramientas locales/servicios que lean esos campos del perfil (con RLS) y luego interceptar intents como “mi nombre / mi email / mi DNI”.',
    ].join('\n');

    this.agentService.addLocalAgentMessage(response, ['local_info']);
  }

  private parseBookingCommand(text: string): { carId: string; startDate: string; endDate: string } | null {
    const uuid = this.extractFirstUuid(text);
    if (!uuid) return null;

    const dates = this.extractDateCandidates(text);
    if (dates.length < 2) return null;

    const startDate = this.normalizeToLocalDateString(dates[0]);
    const endDate = this.normalizeToLocalDateString(dates[1]);
    if (!this.isIsoDate(startDate) || !this.isIsoDate(endDate)) return null;

    return { carId: uuid, startDate, endDate };
  }

  private extractFirstUuid(text: string): string | null {
    const match = text.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    return match?.[0] ?? null;
  }

  private extractDateCandidates(text: string): string[] {
    // Acepta formatos comunes:
    // - YYYY-MM-DD
    // - DD/MM/YYYY
    const isoMatches = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
    const dmyMatches = text.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g) ?? [];
    return [...isoMatches, ...dmyMatches];
  }

  private isIsoDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private normalizeToLocalDateString(value: string): string {
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    // DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
      const [d, m, y] = value.split('/').map((v) => Number(v));
      if (!y || !m || !d) return value;
      const year = String(y).padStart(4, '0');
      const month = String(m).padStart(2, '0');
      const day = String(d).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Fallback (best effort)
    try {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return value;
    }
  }

  private async createBookingFromCommand(
    originalText: string,
    command: { carId: string; startDate: string; endDate: string },
  ): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const msgId = this.agentService.addLocalAgentMessage(
      `Creando tu reserva para ${command.startDate} → ${command.endDate}...`,
      ['local_booking'],
    );

    const auth = await this.getAuthSnapshot();
    if (!auth) {
      this.agentService.updateMessageContent(
        msgId,
        'Necesitás iniciar sesión para crear una reserva. ¿Querés que abra el login?',
        ['local_booking'],
      );
      return;
    }

    try {
      const result = await this.bookingsService.createBookingWithValidation(
        command.carId,
        command.startDate,
        command.endDate,
      );

      if (!result.success || !result.booking) {
        this.agentService.updateMessageContent(
          msgId,
          result.error || 'No pude crear la reserva. Probá con otro auto o cambiá fechas.',
          ['local_booking'],
        );
        return;
      }

      this.agentService.updateMessageContent(
        msgId,
        `Listo. Creé la reserva en tu cuenta (ID: ${result.booking.id}). Te llevo al pago/detalle.`,
        ['local_booking'],
      );

      this.router.navigate(['/bookings', result.booking.id, 'detail-payment']);
    } catch {
      this.agentService.updateMessageContent(
        msgId,
        'Error al crear la reserva. Si el auto ya está reservado en esas fechas, probá con otras.',
        ['local_booking'],
      );
    }
  }

  private async buildChatContext(text: string): Promise<ChatContext | undefined> {
    const profile = this.profileStore.profile();
    const session = await this.authService.ensureSession();
    const userId = session?.user?.id ?? profile?.id;
    const userEmail = session?.user?.email ?? undefined;
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'es-AR';
    const timezone =
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'America/Argentina/Buenos_Aires';

    const marketOverride = this.lastMarket();
    const context: ChatContext = {
      locale,
      timezone,
      currency: profile?.currency ?? undefined,
      market: {
        country: marketOverride?.country ?? profile?.country ?? 'AR',
        city: marketOverride?.city ?? profile?.city ?? undefined,
      },
      rentalPreferences:
        this.lastPickupPreference() || this.lastDropoffPreference()
          ? {
            pickup: this.lastPickupPreference() ?? undefined,
            dropoff: this.lastDropoffPreference() ?? undefined,
            sameLocation:
              this.lastPickupPreference() !== null &&
              this.lastPickupPreference() === this.lastDropoffPreference(),
            addressHint: this.lastAddressHint() ?? undefined,
          }
          : undefined,
      auth: {
        userId: userId ?? undefined,
        email: userEmail,
        isAuthenticated: !!userId,
      },
      userProfile: profile
        ? {
          id: profile.id,
          email: userEmail,
          full_name: profile.full_name,
          role: profile.role,
          city: profile.city ?? null,
          country: profile.country ?? null,
          kyc: profile.kyc,
          can_publish_cars: profile.can_publish_cars,
          can_book_cars: profile.can_book_cars,
        }
        : undefined,
    };

    const location = this.lastLocation() ?? (await this.resolveLocationContext(text));
    if (location) {
      this.lastLocation.set(location);
      context.userLocation = {
        lat: location.lat,
        lng: location.lng,
        address: location.address,
        source: location.source,
        accuracy: location.accuracy,
        city: profile?.city ?? undefined,
      };
      if (!context.market?.city && location.address) {
        context.market = {
          ...context.market,
          city: location.address,
        };
      }
    }

    return context;
  }

  private wantsCurrentLocation(text: string): boolean {
    const normalized = this.normalizeInput(text);

    // Evita capturar frases de búsqueda de autos (se manejan con otro intent)
    if (/(auto|autos|vehiculo|vehiculos|coche|coches)/.test(normalized)) return false;

    // Tolerante a typos comunes: "ubicaicon" / "ubication" / "ubicasion" etc.
    const mentionsLocationWord = /(ubic|ubica|ubicac|ubicaic|ubicaicon|ubication|ubicasion)/.test(normalized);
    const mentionsUse = /(usar|usa|usemos|dame|dime|quiero)/.test(normalized);
    const mentionsNow = /(actual|ahora|en este momento)/.test(normalized);
    const explicit =
      /ubicacion actual|usar mi ubicacion|usar ubicacion actual|mi ubicacion actual|mi ubicacion|cual es mi ubicacion|donde estoy/.test(
        normalized,
      );

    // "usar mi ubicaicon" → mentionsUse + mentionsLocationWord
    if (mentionsUse && mentionsLocationWord) return true;

    return explicit || (mentionsLocationWord && mentionsNow);
  }

  private notifyVoiceError(err: unknown): void {
    const now = Date.now();
    if (now - this.lastVoiceErrorAt < 1500) return;
    this.lastVoiceErrorAt = now;

    const message =
      typeof err === 'string'
        ? err
        : err instanceof Error
          ? err.message
          : (err as { error?: string })?.error
            ? String((err as { error?: string }).error)
            : null;

    const lowerMessage = message?.toLowerCase() ?? '';

    // Caso benigno: doble tap o evento duplicado
    if (lowerMessage.includes('recognition has already started')) {
      this.agentService.addLocalAgentMessage('Ya estoy escuchando. Hablame ahora.', ['local_voice']);
      return;
    }

    // Caso benigno: no se detectó habla (silencio o timeout)
    if (lowerMessage.includes('no-speech')) {
      this.agentService.addLocalAgentMessage(
        'No detecté tu voz. Tocá el micrófono y hablá más cerca del dispositivo.',
        ['local_voice'],
      );
      return;
    }

    // Caso benigno: usuario canceló o se detuvo abruptamente
    if (lowerMessage.includes('aborted') || lowerMessage.includes('cancelled')) {
      // Silencioso - no mostrar mensaje
      return;
    }

    // Caso benigno: el audio fue inaudible
    if (lowerMessage.includes('audio-capture') || lowerMessage.includes('not-allowed')) {
      this.agentService.addLocalAgentMessage(
        'No tengo acceso al micrófono. Habilitá el permiso en tu navegador y recargá la página.',
        ['local_voice'],
      );
      return;
    }

    // Caso benigno: red o servicio no disponible
    if (lowerMessage.includes('network') || lowerMessage.includes('service-not-allowed')) {
      this.agentService.addLocalAgentMessage(
        'Error de conexión con el servicio de voz. Verificá tu conexión a internet.',
        ['local_voice'],
      );
      return;
    }

    // Error desconocido - mostrar hint genérico
    const hint =
      'No pude activar el micrófono. Revisá permisos del navegador y que estés en HTTPS (o localhost).';

    this.agentService.addLocalAgentMessage(
      message ? `${hint} Detalle: ${message}` : hint,
      ['local_voice'],
    );
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

  private wantsLocationContext(text: string): boolean {
    return /ubicaci[oó]n|cerca|cercan|aqui|ac[aá]|estoy en|direcci[oó]n/.test(text);
  }

  private looksLikeAddress(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.length < 8 || trimmed.length > 120) return false;
    return trimmed.includes(',') || trimmed.includes(' y ') || trimmed.includes(' & ');
  }

  private normalizeInput(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isWalletQuery(text: string): boolean {
    const normalized = this.normalizeInput(text);
    return /(wallet|billetera|saldo|balance|saldo disponible)/.test(normalized);
  }

  private async resolveLocationContext(text: string): Promise<LocationData | null> {
    const normalized = text.toLowerCase();

    if (this.wantsCurrentLocation(normalized)) {
      return await this.locationService.getLocationByChoice('current');
    }

    if (this.looksLikeAddress(normalized)) {
      try {
        const profile = this.profileStore.profile();
        const countryHint = profile?.country ?? 'AR';
        const result = await this.geocodingService.geocodeAddress(text, countryHint);
        return {
          lat: result.latitude,
          lng: result.longitude,
          source: 'address',
          address: result.fullAddress,
        };
      } catch {
        // Ignore geocoding errors and fallback to home/gps
      }
    }

    if (this.wantsLocationContext(normalized)) {
      const home = await this.locationService.getHomeLocation();
      if (home) return home;
      return await this.locationService.getCurrentPosition().then((loc) =>
        loc
          ? {
            ...loc,
            source: 'gps',
          }
          : null,
      );
    }

    return await this.locationService.getHomeLocation();
  }

  private async getAuthSnapshot(): Promise<{ id: string; email?: string } | null> {
    const session = await this.authService.ensureSession();
    const user = session?.user;
    if (!user?.id) return null;
    return { id: user.id, email: user.email ?? undefined };
  }

  private formatMoney(amount: number, currency = 'USD'): string {
    const formatter = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  }

  private async respondWithToolsSummary(originalText: string): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const auth = await this.getAuthSnapshot();
    let profile = this.profileStore.profile();
    if (auth && !profile) {
      try {
        profile = await this.profileStore.loadProfile();
      } catch {
        profile = this.profileStore.profile();
      }
    }

    const loggedInfo = auth
      ? `Estás logueado como ${profile?.full_name ?? 'Usuario'} (${auth.email ?? 'sin email'})`
      : 'No estás logueado. Si querés, puedo abrir el login.';

    const response = [
      loggedInfo,
      '',
      'Herramientas disponibles en tu cuenta:',
      '• Perfil: ver y editar datos personales.',
      '• Autos: ver tus autos publicados o publicar uno nuevo.',
      '• Wallet: ver saldo, depositar y retirar.',
      '• Documentos: verificación y estado de tus documentos.',
      '• Reservas: ver y gestionar tus reservas.',
      '• Mensajes: abrir tus chats.',
      '',
      'Decime “mi perfil”, “mis autos”, “mi wallet” o “mis documentos”.',
    ].join('\n');

    this.agentService.addLocalAgentMessage(response, ['local_info']);
  }

  private async respondWithAccountSummary(originalText: string): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const msgId = this.agentService.addLocalAgentMessage(
      'Estoy revisando tu cuenta...',
      ['local_profile'],
    );

    const auth = await this.getAuthSnapshot();
    if (!auth) {
      this.agentService.updateMessageContent(
        msgId,
        'No estás logueado. ¿Querés que abra la pantalla de login?',
        ['local_profile'],
      );
      return;
    }

    try {
      const profile = await this.profileStore.loadProfile();
      const role = profile?.role ?? 'renter';
      const kyc = profile?.kyc ?? 'not_started';
      const permissions = [
        profile?.can_publish_cars ? 'puede publicar autos' : 'no puede publicar autos',
        profile?.can_book_cars ? 'puede reservar autos' : 'no puede reservar autos',
      ];

      const response = [
        `Estás logueado como ${profile?.full_name ?? 'Usuario'} (${auth.email ?? 'sin email'}).`,
        `ID de usuario: ${auth.id}`,
        `Rol: ${role}.`,
        `Verificación (KYC): ${kyc}.`,
        `Permisos: ${permissions.join(', ')}.`,
      ].join(' ');

      this.agentService.updateMessageContent(msgId, response, ['local_profile']);
    } catch {
      this.agentService.updateMessageContent(
        msgId,
        'No pude cargar tu perfil en este momento. ¿Querés intentarlo de nuevo?',
        ['local_profile'],
      );
    }
  }

  private async respondWithWalletSummary(originalText: string): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const msgId = this.agentService.addLocalAgentMessage(
      'Consultando tu wallet...',
      ['local_wallet'],
    );

    await this.fillWalletSummary(msgId);
  }

  private async fillWalletSummary(messageId: string): Promise<void> {
    const auth = await this.getAuthSnapshot();
    if (!auth) {
      this.agentService.updateMessageContent(
        messageId,
        'Necesitás iniciar sesión para ver tu wallet.',
        ['local_wallet'],
      );
      return;
    }

    try {
      const balance: WalletBalance = await this.walletService.fetchBalance(true);
      const currency = balance.currency || 'USD';
      const response = [
        `Saldo disponible: ${this.formatMoney(balance.available_balance, currency)}.`,
        `Saldo bloqueado: ${this.formatMoney(balance.locked_balance, currency)}.`,
        `Saldo total: ${this.formatMoney(balance.total_balance, currency)}.`,
        `Crédito AutoRenta: ${this.formatMoney(balance.autorentar_credit_balance, currency)}.`,
      ].join(' ');
      this.agentService.updateMessageContent(messageId, response, ['local_wallet']);
    } catch {
      this.agentService.updateMessageContent(
        messageId,
        'No pude obtener tu saldo en este momento. ¿Querés abrir la wallet?',
        ['local_wallet'],
      );
    }
  }

  private async respondWithMyCarsSummary(originalText: string): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const msgId = this.agentService.addLocalAgentMessage(
      'Buscando tus autos...',
      ['local_cars'],
    );

    const auth = await this.getAuthSnapshot();
    if (!auth) {
      this.agentService.updateMessageContent(
        msgId,
        'Necesitás iniciar sesión para ver tus autos.',
        ['local_cars'],
      );
      return;
    }

    try {
      const cars = await this.carsService.listMyCars();
      if (!cars.length) {
        this.agentService.updateMessageContent(
          msgId,
          'No tenés autos publicados todavía. ¿Querés publicar uno ahora?',
          ['local_cars'],
        );
        return;
      }

      const preview = cars
        .slice(0, 3)
        .map((car) => `${car.brand ?? car.brand_name ?? 'Auto'} ${car.model ?? ''}`.trim())
        .filter(Boolean);

      const response = [
        `Tenés ${cars.length} auto(s) publicados.`,
        preview.length ? `Ejemplos: ${preview.join(', ')}.` : '',
        '¿Querés abrir “Mis autos”?',
      ]
        .filter(Boolean)
        .join(' ');

      this.agentService.updateMessageContent(msgId, response, ['local_cars']);
    } catch {
      this.agentService.updateMessageContent(
        msgId,
        'No pude cargar tus autos en este momento.',
        ['local_cars'],
      );
    }
  }

  private async respondWithDocumentsSummary(originalText: string): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const msgId = this.agentService.addLocalAgentMessage(
      'Revisando tus documentos...',
      ['local_documents'],
    );

    const auth = await this.getAuthSnapshot();
    if (!auth) {
      this.agentService.updateMessageContent(
        msgId,
        'Necesitás iniciar sesión para ver tus documentos.',
        ['local_documents'],
      );
      return;
    }

    try {
      const docs = await this.verificationService.loadDocuments();
      if (!docs.length) {
        this.agentService.updateMessageContent(
          msgId,
          'No encuentro documentos cargados aún. ¿Querés ir a verificación?',
          ['local_documents'],
        );
        return;
      }

      const counts = docs.reduce(
        (acc, doc) => {
          acc[doc.status] = (acc[doc.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const response = [
        `Documentos: ${docs.length} en total.`,
        counts['verified'] ? `Verificados: ${counts['verified']}.` : '',
        counts['pending'] ? `En revisión: ${counts['pending']}.` : '',
        counts['rejected'] ? `Rechazados: ${counts['rejected']}.` : '',
        '¿Querés abrir la sección de verificación?',
      ]
        .filter(Boolean)
        .join(' ');

      this.agentService.updateMessageContent(msgId, response, ['local_documents']);
    } catch {
      this.agentService.updateMessageContent(
        msgId,
        'No pude cargar tus documentos en este momento.',
        ['local_documents'],
      );
    }
  }

  private async navigateToNearbyCars(originalText: string): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const msgId = this.agentService.addLocalAgentMessage(
      'Buscando autos cercanos a tu ubicación...',
      ['local_nearby'],
    );

    try {
      const location = this.lastLocation() ?? (await this.locationService.getUserLocation());
      if (!location) {
        this.agentService.updateMessageContent(
          msgId,
          'Necesito tu ubicación para ordenar por distancia. Podés decir “usar ubicación actual” o indicar una dirección.',
          ['local_nearby'],
        );
        return;
      }

      this.lastLocation.set(location);
      this.persistLocationOverride(location);

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('autorenta:list-sort', 'distance');
      }

      const params = new URLSearchParams();
      params.set('sort', 'distance');
      params.set('nearby', '1');
      params.set('lat', String(location.lat));
      params.set('lng', String(location.lng));

      this.agentService.updateMessageContent(
        msgId,
        'Listo. Te muestro los autos más cercanos.',
        ['local_nearby'],
      );
      this.router.navigate(['/cars/list'], { queryParams: Object.fromEntries(params.entries()) });
    } catch {
      this.agentService.updateMessageContent(
        msgId,
        'No pude obtener tu ubicación. ¿Querés usar tu ubicación actual o decirme una dirección?',
        ['local_nearby'],
      );
    }
  }

  private async respondWithNearestCar(originalText: string): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const msgId = this.agentService.addLocalAgentMessage(
      'Buscando el auto más cercano a tu ubicación...',
      ['local_nearby'],
    );

    try {
      const location = this.lastLocation() ?? (await this.locationService.getUserLocation());
      if (!location) {
        this.agentService.updateMessageContent(
          msgId,
          'Necesito tu ubicación para decirte cuál es el más cercano. Podés decir "usar ubicación actual" o indicar una dirección.',
          ['local_nearby'],
        );
        return;
      }

      this.lastLocation.set(location);
      this.persistLocationOverride(location);

      // Fetch active cars with bounding box filter (~50km radius)
      const radiusKm = 50;
      const latDelta = radiusKm / 111; // ~111km per degree of latitude
      const lngDelta = radiusKm / (111 * Math.cos((location.lat * Math.PI) / 180));

      const cars = await this.carsService.listActiveCars({
        bounds: {
          north: location.lat + latDelta,
          south: location.lat - latDelta,
          east: location.lng + lngDelta,
          west: location.lng - lngDelta,
        },
      });

      // Calculate distance and sort
      const carsWithDistance = cars
        .filter((car) => car.location_lat && car.location_lng)
        .map((car) => ({
          ...car,
          distance_km: this.calculateDistanceKm(
            location.lat,
            location.lng,
            car.location_lat!,
            car.location_lng!,
          ),
        }))
        .sort((a, b) => a.distance_km - b.distance_km);

      const nearest = carsWithDistance[0];
      if (!nearest) {
        this.agentService.updateMessageContent(
          msgId,
          'No encontré autos cerca de tu ubicación. Te muestro el listado para que veas más opciones.',
          ['local_nearby'],
        );
        this.router.navigate(['/cars/list']);
        return;
      }

      const distanceText = `${nearest.distance_km.toFixed(1)} km`;
      const carTitle = nearest.title || `${nearest.brand} ${nearest.model}`;
      const priceText =
        typeof nearest.price_per_day === 'number' && Number.isFinite(nearest.price_per_day)
          ? `${nearest.currency || 'USD'} ${nearest.price_per_day}/día`
          : null;

      const response = [
        `El auto más cercano es "${carTitle}" a ${distanceText}.`,
        priceText ? `Precio: ${priceText}.` : '',
        'Te abro la lista ordenada por distancia.',
      ]
        .filter(Boolean)
        .join(' ');

      this.agentService.updateMessageContent(msgId, response, ['local_nearby']);

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('autorenta:list-sort', 'distance');
      }

      const params = new URLSearchParams();
      params.set('sort', 'distance');
      params.set('nearby', '1');
      params.set('lat', String(location.lat));
      params.set('lng', String(location.lng));
      this.router.navigate(['/cars/list'], { queryParams: Object.fromEntries(params.entries()) });
    } catch {
      this.agentService.updateMessageContent(
        msgId,
        'No pude obtener el auto más cercano en este momento. ¿Querés usar tu ubicación actual o decirme una dirección?',
        ['local_nearby'],
      );
    }
  }

  private persistLocationOverride(location: LocationData): void {
    if (typeof sessionStorage === 'undefined') return;
    const payload = {
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy ?? null,
      timestamp: location.timestamp ?? Date.now(),
      source: location.source,
      address: location.address ?? null,
    };
    try {
      sessionStorage.setItem(this.locationOverrideKey, JSON.stringify(payload));
    } catch {
      // Ignore storage failures
    }
  }

  private parsePickupPreference(text: string): {
    pickup: 'owner_address' | 'office' | 'airport' | 'custom';
    dropoff?: 'owner_address' | 'office' | 'airport' | 'custom';
    sameLocation?: boolean;
    addressHint?: string;
  } | null {
    const normalized = text.toLowerCase();
    const mentionsOwner =
      /(casa|domicilio).*(due[ñn]o|propietario|anfitri[oó]n)/.test(normalized) ||
      /(en la casa del due[ñn]o|en el domicilio del due[ñn]o)/.test(normalized);
    const mentionsSame =
      /(mismo lugar|misma direcci[oó]n|igual que lo retir(e|e)|igual que lo retiro)/.test(
        normalized,
      );
    const mentionsAirport = /(aeropuerto|airport)/.test(normalized);
    const mentionsOffice = /(oficina|sucursal|centro)/.test(normalized);
    const mentionsHome = /(entrega a domicilio|retiro en domicilio|domicilio)/.test(normalized);

    if (mentionsOwner || mentionsHome) {
      return {
        pickup: 'owner_address',
        dropoff: mentionsSame ? 'owner_address' : undefined,
        sameLocation: mentionsSame,
        addressHint: undefined,
      };
    }

    if (mentionsAirport) {
      return {
        pickup: 'airport',
        dropoff: mentionsSame ? 'airport' : undefined,
        sameLocation: mentionsSame,
      };
    }

    if (mentionsOffice) {
      return {
        pickup: 'office',
        dropoff: mentionsSame ? 'office' : undefined,
        sameLocation: mentionsSame,
      };
    }

    return null;
  }

  /**
   * Get info about the nearest car (without navigating)
   */
  private async getNearestCarInfo(lat: number, lng: number): Promise<string | null> {
    try {
      const radiusKm = 50;
      const latDelta = radiusKm / 111;
      const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

      const cars = await this.carsService.listActiveCars({
        bounds: {
          north: lat + latDelta,
          south: lat - latDelta,
          east: lng + lngDelta,
          west: lng - lngDelta,
        },
      });

      const carsWithDistance = cars
        .filter((car) => car.location_lat && car.location_lng)
        .map((car) => ({
          ...car,
          distance_km: this.calculateDistanceKm(lat, lng, car.location_lat!, car.location_lng!),
        }))
        .sort((a, b) => a.distance_km - b.distance_km);

      const nearest = carsWithDistance[0];
      if (!nearest) return null;

      const carTitle = nearest.title || `${nearest.brand} ${nearest.model}`;
      const distanceText = `${nearest.distance_km.toFixed(1)} km`;
      const priceText =
        typeof nearest.price_per_day === 'number'
          ? `${nearest.currency || 'USD'} ${nearest.price_per_day}/día`
          : '';

      return `El auto más cercano a ti es "${carTitle}" a ${distanceText}.${priceText ? ` Precio: ${priceText}.` : ''}`;
    } catch {
      return null;
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private shouldOverrideEcuadorResponse(message: string): boolean {
    const lower = message.toLowerCase();
    const mentionsEcuador = /(ecuador|quito|guayaquil)/.test(lower);
    if (!mentionsEcuador) return false;

    const market = this.lastMarket();
    if (market?.country?.toLowerCase() === 'ar') return true;
    if (market?.city?.toLowerCase().includes('buenos')) return true;

    const profile = this.profileStore.profile();
    if (profile?.country?.toLowerCase() === 'ar') return true;
    if (profile?.city?.toLowerCase()?.includes('buenos')) return true;

    const locale = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : '';
    const timezone =
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone.toLowerCase()
        : '';

    if (locale.startsWith('es-ar')) return true;
    if (timezone.includes('argentina') || timezone.includes('buenos_aires')) return true;

    return false;
  }

  private shouldOverrideConfusedResponse(message: string): boolean {
    const lower = message.toLowerCase();
    return (
      lower.includes('no entiendo') ||
      lower.includes('no entendi') ||
      lower.includes('no pude') ||
      lower.includes('no puedo') ||
      lower.includes('no tengo la capacidad') ||
      lower.includes('no tengo acceso') ||
      lower.includes('no puedo mostrar') ||
      lower.includes('no puedo ver') ||
      lower.includes('disculpa') ||
      lower.includes('necesitas ayuda') ||
      lower.includes('quizas')
    );
  }

  private shouldOverrideWalletLookup(message: string): boolean {
    const normalized = this.normalizeInput(message);
    return (
      normalized.includes('clienteid') ||
      normalized.includes('numero de documento') ||
      normalized.includes('numero de telefono') ||
      normalized.includes('telefono') ||
      normalized.includes('cedula') ||
      normalized.includes('pasaporte') ||
      normalized.includes('buscar tu perfil')
    );
  }

  private shouldOverrideGreetingResponse(message: string): boolean {
    const normalized = this.normalizeInput(message);
    return (
      normalized.includes('hola') &&
      (normalized.includes('bienvenido') ||
        normalized.includes('asistente') ||
        normalized.includes('autorentar') ||
        normalized.includes('dni') ||
        normalized.includes('licencia') ||
        normalized.includes('garantia'))
    );
  }

  private async overrideWithWalletSummary(messageId: string): Promise<void> {
    this.lastSanitizedMessageId.set(messageId);
    this.agentService.updateMessageContent(
      messageId,
      'Claro, te muestro tu wallet...',
      ['local_wallet'],
    );
    await this.fillWalletSummary(messageId);
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  // ============================================
  // CAPABILITY BUTTONS - Quick Actions
  // ============================================

  /**
   * Dispatcher for capability button clicks
   */
  onCapabilityClick(action: 'search_cars' | 'calculate_price' | 'stats' | 'help'): void {
    switch (action) {
      case 'search_cars':
        void this.searchNearbyCarsCapability();
        break;
      case 'calculate_price':
        void this.calculatePriceCapability();
        break;
      case 'stats':
        void this.showStatsCapability();
        break;
      case 'help':
        void this.showHelpCapability();
        break;
    }
  }

  /**
   * Search for the 3 nearest cars with geolocation
   * Shows car details with option to rent the first one for 3 days
   */
  private async searchNearbyCarsCapability(): Promise<void> {
    this.agentService.addLocalUserMessage('🚗 Buscar autos disponibles cerca de mí');
    const msgId = this.agentService.addLocalAgentMessage(
      'Obteniendo tu ubicación...',
      ['local_nearby'],
    );
    this.shouldScrollToBottom = true;

    try {
      // Try to get current location, request permission if needed
      let location = this.lastLocation();
      if (!location) {
        location = await this.locationService.getLocationByChoice('current');
      }

      if (!location) {
        this.agentService.updateMessageContent(
          msgId,
          '📍 Necesito tu ubicación para encontrar autos cercanos.\n\n' +
          'Por favor, permite el acceso a tu ubicación en el navegador o decime una dirección.',
          ['local_nearby'],
        );
        return;
      }

      this.lastLocation.set(location);
      this.persistLocationOverride(location);

      this.agentService.updateMessageContent(
        msgId,
        `📍 Ubicación: ${location.address || 'Obtenida'}\n🔍 Buscando autos cercanos...`,
        ['local_nearby'],
      );

      // Fetch active cars within 50km radius
      const radiusKm = 50;
      const latDelta = radiusKm / 111;
      const lngDelta = radiusKm / (111 * Math.cos((location.lat * Math.PI) / 180));

      const cars = await this.carsService.listActiveCars({
        bounds: {
          north: location.lat + latDelta,
          south: location.lat - latDelta,
          east: location.lng + lngDelta,
          west: location.lng - lngDelta,
        },
      });

      // Calculate distance and sort by nearest
      const carsWithDistance = cars
        .filter((car) => car.location_lat && car.location_lng)
        .map((car) => ({
          ...car,
          distance_km: this.calculateDistanceKm(
            location!.lat,
            location!.lng,
            car.location_lat!,
            car.location_lng!,
          ),
        }))
        .sort((a, b) => a.distance_km - b.distance_km)
        .slice(0, 3); // Top 3 nearest

      if (carsWithDistance.length === 0) {
        this.agentService.updateMessageContent(
          msgId,
          '😔 No encontré autos disponibles cerca de tu ubicación.\n\n' +
          '¿Querés que busque en toda la plataforma?',
          ['local_nearby'],
        );
        return;
      }

      // Build response with 3 nearest cars
      const carsList = carsWithDistance.map((car, index) => {
        const title = car.title || `${car.brand} ${car.model}`;
        const distance = `${car.distance_km.toFixed(1)} km`;
        const price = car.price_per_day
          ? `${car.currency || 'USD'} ${car.price_per_day}/día`
          : 'Consultar precio';
        const city = car.location_city || car.location_state || '';

        return `${index + 1}. **${title}**\n   📍 ${distance} - ${city}\n   💰 ${price}`;
      }).join('\n\n');

      const firstCar = carsWithDistance[0];
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 3);
      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const totalPrice3Days = firstCar.price_per_day
        ? (firstCar.price_per_day * 3).toFixed(0)
        : null;

      const rentOption = firstCar.price_per_day
        ? `\n\n💡 **Alquilar el primero por 3 días:**\nDesde hoy (${startDateStr}) hasta ${endDateStr}\nTotal estimado: ${firstCar.currency || 'USD'} ${totalPrice3Days}\n\nDecí "alquilar el primero" o escribí "reservar ${firstCar.id} ${startDateStr} ${endDateStr}"`
        : '';

      this.agentService.updateMessageContent(
        msgId,
        `🚗 **Los 3 autos más cercanos:**\n\n${carsList}${rentOption}`,
        ['local_nearby', 'search_cars'],
      );

      // Store first car for quick booking
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('rentarfast:nearest_car', JSON.stringify({
          id: firstCar.id,
          title: firstCar.title || `${firstCar.brand} ${firstCar.model}`,
          price_per_day: firstCar.price_per_day,
          currency: firstCar.currency || 'USD',
        }));
      }

    } catch (err) {
      this.agentService.updateMessageContent(
        msgId,
        '❌ No pude obtener tu ubicación. Por favor, habilitá los permisos de ubicación o decime una dirección.',
        ['local_nearby'],
      );
    }
  }

  /**
   * Calculate rental price for the nearest car for 3 days
   */
  private async calculatePriceCapability(): Promise<void> {
    this.agentService.addLocalUserMessage('💰 Calcular precios de alquiler');
    const msgId = this.agentService.addLocalAgentMessage(
      'Calculando precios...',
      ['local_pricing'],
    );
    this.shouldScrollToBottom = true;

    try {
      // Check if we have a stored nearest car
      let storedCar: { id: string; title: string; price_per_day: number; currency: string } | null = null;
      if (typeof sessionStorage !== 'undefined') {
        const stored = sessionStorage.getItem('rentarfast:nearest_car');
        if (stored) {
          storedCar = JSON.parse(stored);
        }
      }

      if (!storedCar) {
        // Need to search first
        this.agentService.updateMessageContent(
          msgId,
          '🔍 Primero necesito buscar autos disponibles.\n\n' +
          'Tocá "🚗 Buscar autos disponibles" para ver opciones cerca tuyo, o decime qué auto te interesa.',
          ['local_pricing'],
        );
        return;
      }

      const today = new Date();
      const pricePerDay = storedCar.price_per_day;
      const currency = storedCar.currency;

      // Calculate for different periods
      const prices = [
        { days: 1, total: pricePerDay },
        { days: 3, total: pricePerDay * 3 },
        { days: 7, total: pricePerDay * 7 },
        { days: 30, total: pricePerDay * 30 },
      ];

      const priceList = prices.map(p =>
        `• ${p.days} día${p.days > 1 ? 's' : ''}: **${currency} ${p.total.toFixed(0)}**`
      ).join('\n');

      const endDate3Days = new Date(today);
      endDate3Days.setDate(today.getDate() + 3);

      this.agentService.updateMessageContent(
        msgId,
        `💰 **Precios para ${storedCar.title}:**\n\n${priceList}\n\n` +
        `📅 Para reservar por 3 días desde hoy:\nDecí "alquilar el primero" o "reservar ${storedCar.id} ${today.toISOString().split('T')[0]} ${endDate3Days.toISOString().split('T')[0]}"`,
        ['local_pricing', 'calculate_price'],
      );
    } catch {
      this.agentService.updateMessageContent(
        msgId,
        '❌ Error al calcular precios. Probá buscar autos primero.',
        ['local_pricing'],
      );
    }
  }

  /**
   * Show user statistics (bookings, earnings, etc.)
   */
  private async showStatsCapability(): Promise<void> {
    this.agentService.addLocalUserMessage('📊 Ver estadísticas');
    const msgId = this.agentService.addLocalAgentMessage(
      'Cargando estadísticas...',
      ['local_stats'],
    );
    this.shouldScrollToBottom = true;

    const auth = await this.getAuthSnapshot();
    if (!auth) {
      this.agentService.updateMessageContent(
        msgId,
        '🔐 Necesitás iniciar sesión para ver tus estadísticas.\n\n¿Querés que abra el login?',
        ['local_stats'],
      );
      return;
    }

    try {
      // Get bookings as renter
      const { bookings: renterBookings } = await this.bookingsService.getMyBookings({ limit: 100 });
      const completedRentals = renterBookings.filter(b => b.status === 'completed').length;
      const activeRentals = renterBookings.filter(b => b.status === 'in_progress' || b.status === 'confirmed').length;
      const pendingRentals = renterBookings.filter(b => b.status === 'pending').length;

      // Get my cars (as owner)
      const myCars = await this.carsService.listMyCars();
      const publishedCars = myCars.filter(c => c.status === 'active').length;

      // Get wallet balance
      let walletInfo = '';
      try {
        const balance = await this.walletService.fetchBalance(true);
        walletInfo = `\n\n💳 **Wallet:**\n• Disponible: ${balance.currency || 'USD'} ${balance.available_balance.toFixed(2)}\n• Bloqueado: ${balance.currency || 'USD'} ${balance.locked_balance.toFixed(2)}`;
      } catch {
        walletInfo = '\n\n💳 Wallet: No disponible';
      }

      const profile = this.profileStore.profile();
      const userName = profile?.full_name || 'Usuario';

      this.agentService.updateMessageContent(
        msgId,
        `📊 **Estadísticas de ${userName}:**\n\n` +
        `🚗 **Como arrendatario:**\n` +
        `• Alquileres completados: ${completedRentals}\n` +
        `• Alquileres activos: ${activeRentals}\n` +
        `• Pendientes: ${pendingRentals}\n\n` +
        `🏠 **Como propietario:**\n` +
        `• Autos publicados: ${publishedCars}/${myCars.length}` +
        walletInfo,
        ['local_stats', 'stats'],
      );
    } catch {
      this.agentService.updateMessageContent(
        msgId,
        '❌ Error al cargar estadísticas. Intentalo de nuevo.',
        ['local_stats'],
      );
    }
  }

  /**
   * Show help/capabilities summary
   */
  private async showHelpCapability(): Promise<void> {
    this.agentService.addLocalUserMessage('❓ ¿Qué puedo hacer?');
    this.shouldScrollToBottom = true;

    const auth = await this.getAuthSnapshot();
    const loginStatus = auth
      ? '✅ Estás logueado'
      : '❌ No estás logueado (algunas funciones requieren login)';

    this.agentService.addLocalAgentMessage(
      `🤖 **Soy Rentarfast, tu asistente de AutoRentar**\n\n${loginStatus}\n\n` +
      `**Puedo ayudarte con:**\n\n` +
      `🚗 **Buscar autos:**\n• "Buscar autos cerca de mí"\n• "Mostrar el auto más cercano"\n• "Autos en Buenos Aires"\n\n` +
      `💰 **Precios y reservas:**\n• "Calcular precio por 3 días"\n• "Alquilar el primero"\n• "Reservar [auto] del [fecha] al [fecha]"\n\n` +
      `📊 **Tu cuenta:**\n• "Mi wallet" / "Mi saldo"\n• "Mis reservas"\n• "Mis autos"\n• "Mi perfil"\n\n` +
      `🚀 **Acciones rápidas:**\n• "Publicar un auto"\n• "Ver documentos"\n• "Abrir verificación"\n\n` +
      `💡 También podés hablarme usando el micrófono.`,
      ['local_help', 'help'],
    );
  }

  /**
   * Book the first/nearest car for 3 days starting today
   * Creates a real booking and navigates to the payment flow
   */
  private async bookFirstCarCapability(originalText: string): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const msgId = this.agentService.addLocalAgentMessage(
      '🚗 Preparando tu reserva...',
      ['local_booking'],
    );
    this.shouldScrollToBottom = true;

    // Check authentication
    const auth = await this.getAuthSnapshot();
    if (!auth) {
      this.agentService.updateMessageContent(
        msgId,
        '🔐 Necesitás iniciar sesión para hacer una reserva.\n\n¿Querés que abra el login?',
        ['local_booking'],
      );
      return;
    }

    // Get stored car from search
    let storedCar: { id: string; title: string; price_per_day: number; currency: string } | null = null;
    if (typeof sessionStorage !== 'undefined') {
      const stored = sessionStorage.getItem('rentarfast:nearest_car');
      if (stored) {
        storedCar = JSON.parse(stored);
      }
    }

    if (!storedCar) {
      this.agentService.updateMessageContent(
        msgId,
        '🔍 Primero necesito buscar autos disponibles.\n\n' +
        'Tocá "🚗 Buscar autos disponibles" para ver opciones cerca tuyo.',
        ['local_booking'],
      );
      return;
    }

    // Calculate dates: today + 3 days
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 3);
    const startDateStr = today.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const totalPrice = storedCar.price_per_day * 3;

    this.agentService.updateMessageContent(
      msgId,
      `🚗 **Reservando ${storedCar.title}**\n\n` +
      `📅 Del ${startDateStr} al ${endDateStr} (3 días)\n` +
      `💰 Total estimado: ${storedCar.currency} ${totalPrice.toFixed(0)}\n\n` +
      `⏳ Creando reserva...`,
      ['local_booking'],
    );

    try {
      // Create the booking using the existing service
      const result = await this.bookingsService.createBookingWithValidation(
        storedCar.id,
        startDateStr,
        endDateStr,
      );

      if (!result.success || !result.booking) {
        this.agentService.updateMessageContent(
          msgId,
          `❌ ${result.error || 'No pude crear la reserva.'}\n\n` +
          `Posibles causas:\n• El auto no está disponible en esas fechas\n• Ya tenés una reserva activa con este auto\n\n` +
          `¿Querés buscar otros autos?`,
          ['local_booking'],
        );
        return;
      }

      // Success! Navigate to payment flow
      this.agentService.updateMessageContent(
        msgId,
        `✅ **Reserva creada exitosamente**\n\n` +
        `🚗 ${storedCar.title}\n` +
        `📅 ${startDateStr} → ${endDateStr}\n` +
        `💰 Total: ${storedCar.currency} ${totalPrice.toFixed(0)}\n\n` +
        `🎯 Te llevo al pago para confirmar tu reserva...`,
        ['local_booking', 'booking_created'],
      );

      // Clear stored car after booking
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('rentarfast:nearest_car');
      }

      // Navigate to booking detail/payment after a short delay
      setTimeout(() => {
        this.router.navigate(['/bookings', result.booking!.id, 'detail-payment']);
      }, 1500);

    } catch (err) {
      this.agentService.updateMessageContent(
        msgId,
        '❌ Error al crear la reserva. El auto puede no estar disponible en esas fechas.\n\n' +
        '¿Querés buscar otros autos disponibles?',
        ['local_booking'],
      );
    }
  }
}
