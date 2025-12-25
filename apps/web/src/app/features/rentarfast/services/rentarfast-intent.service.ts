import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RentarfastAgentService } from '@core/services/ai/rentarfast-agent.service';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { CarsService } from '@core/services/cars/cars.service';
import { GeocodingService } from '@core/services/geo/geocoding.service';
import { LocationData, LocationService } from '@core/services/geo/location.service';
import { WalletService } from '@core/services/payments/wallet.service';
import { VerificationService } from '@core/services/verification/verification.service';
import { ProfileStore } from '@core/stores/profile.store';
import type { WalletBalance } from '@core/models/wallet.model';
import { ChatContext } from '@core/services/ai/rentarfast-agent.service';
import {
  IntentResult,
  BookingCommand,
  PickupPreference,
  PersonalInfoKind,
  NearestCarInfo,
  RentarfastContext,
} from './rentarfast.models';

/**
 * Service that handles local intent detection and responses for the Rentarfast chatbot.
 * Extracts ~600 lines of logic from RentarfastPage for better maintainability.
 */
@Injectable({ providedIn: 'root' })
export class RentarfastIntentService {
  private readonly router = inject(Router);
  private readonly agentService = inject(RentarfastAgentService);
  private readonly locationService = inject(LocationService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly profileStore = inject(ProfileStore);
  private readonly authService = inject(AuthService);
  private readonly walletService = inject(WalletService);
  private readonly carsService = inject(CarsService);
  private readonly verificationService = inject(VerificationService);
  private readonly bookingsService = inject(BookingsService);

  private readonly locationOverrideKey = 'autorenta:location_override';

  // State managed by this service
  private lastLocation: LocationData | null = null;
  private lastMarket: { country?: string; city?: string } | null = null;
  private lastAddressHint: string | null = null;
  private lastPickupPreference: PickupPreference['pickup'] | null = null;
  private lastDropoffPreference: PickupPreference['dropoff'] | null = null;

  /**
   * Get current context (market, location, preferences)
   */
  get context(): RentarfastContext {
    return {
      market: this.lastMarket ?? undefined,
      location: this.lastLocation
        ? { lat: this.lastLocation.lat, lng: this.lastLocation.lng, address: this.lastLocation.address }
        : undefined,
      pickupPreference: this.lastPickupPreference ?? undefined,
      dropoffPreference: this.lastDropoffPreference ?? undefined,
      addressHint: this.lastAddressHint ?? undefined,
    };
  }

  /**
   * Build chat context for AI agent
   */
  async buildChatContext(text: string): Promise<ChatContext | undefined> {
    const profile = this.profileStore.profile();
    const session = await this.authService.ensureSession();
    const userId = session?.user?.id ?? profile?.id;
    const userEmail = session?.user?.email ?? undefined;
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'es-AR';
    const timezone =
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'America/Argentina/Buenos_Aires';

    const context: ChatContext = {
      locale,
      timezone,
      currency: profile?.currency ?? undefined,
      market: {
        country: this.lastMarket?.country ?? profile?.country ?? 'AR',
        city: this.lastMarket?.city ?? profile?.city ?? undefined,
      },
      rentalPreferences:
        this.lastPickupPreference || this.lastDropoffPreference
          ? {
              pickup: this.lastPickupPreference ?? undefined,
              dropoff: this.lastDropoffPreference ?? undefined,
              sameLocation: this.lastPickupPreference !== null && this.lastPickupPreference === this.lastDropoffPreference,
              addressHint: this.lastAddressHint ?? undefined,
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

    const location = this.lastLocation ?? (await this.resolveLocationContext(text));
    if (location) {
      this.lastLocation = location;
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

  /**
   * Try to handle a user message with a local intent handler.
   * Returns true if handled locally, false if should be sent to AI agent.
   */
  async tryHandleLocalIntent(text: string): Promise<IntentResult> {
    const normalized = this.normalizeInput(text);

    // Voice help
    if (this.matchesVoiceHelpIntent(normalized)) {
      await this.respondWithVoiceHelp(text);
      return { handled: true };
    }

    // Navigation: publish car
    if (/(publicar|publica|subir).*(auto|veh[ií]culo)/.test(normalized)) {
      this.agentService.addLocalUserMessage(text);
      this.agentService.addLocalAgentMessage('Listo, te llevo a publicar tu auto.', ['local_navigation']);
      return { handled: true, navigateTo: '/cars/publish' };
    }

    // Navigation: create booking / search cars
    // Pass original text for UUID check (normalization removes hyphens)
    if (this.matchesBookingSearchIntent(normalized, text)) {
      const command = this.parseBookingCommand(text);
      if (command) {
        await this.createBookingFromCommand(text, command);
        return { handled: true };
      }
      this.agentService.addLocalUserMessage(text);
      this.agentService.addLocalAgentMessage(
        'Te llevo a buscar autos disponibles. Ahí podés elegir fechas y reservar.',
        ['local_navigation']
      );
      return { handled: true, navigateTo: '/cars/list' };
    }

    // Navigation: my bookings
    if (/(mis reservas|mis reservaciones|estado de mis reservas|estado de reservas)/.test(normalized)) {
      this.agentService.addLocalUserMessage(text);
      this.agentService.addLocalAgentMessage('Te llevo a tus reservas.', ['local_navigation']);
      return { handled: true, navigateTo: '/bookings' };
    }

    // Navigation: profile
    if (/(mi cuenta|mi perfil|perfil)/.test(normalized)) {
      this.agentService.addLocalUserMessage(text);
      this.agentService.addLocalAgentMessage('Abriendo tu perfil.', ['local_navigation']);
      return { handled: true, navigateTo: '/profile' };
    }

    // Tools summary
    if (this.matchesToolsIntent(normalized)) {
      await this.respondWithToolsSummary(text);
      return { handled: true };
    }

    // Current location
    if (this.wantsCurrentLocation(normalized)) {
      await this.handleCurrentLocation(text);
      return { handled: true };
    }

    // Address input
    if (this.looksLikeAddress(normalized)) {
      const location = await this.resolveLocationContext(text);
      if (location) {
        this.agentService.addLocalUserMessage(text);
        this.lastLocation = location;
        this.lastAddressHint = location.address ?? text;
        this.agentService.addLocalAgentMessage(
          location.address
            ? `Listo, tomaré esa ubicación: ${location.address}.`
            : 'Listo, tomaré esa ubicación.',
          ['local_location']
        );
        return { handled: true };
      }
    }

    // Buenos Aires market
    if (/(buenos aires)/.test(normalized)) {
      this.agentService.addLocalUserMessage(text);
      this.lastMarket = { country: 'AR', city: 'Buenos Aires' };
      this.agentService.addLocalAgentMessage(
        'Perfecto, usaré Buenos Aires, Argentina para las búsquedas.',
        ['local_location']
      );
      return { handled: true };
    }

    // Argentina market
    if (/(argentina)/.test(normalized)) {
      this.agentService.addLocalUserMessage(text);
      this.lastMarket = { country: 'AR' };
      this.agentService.addLocalAgentMessage(
        'Perfecto, uso Argentina como país. Si querés, decime ciudad o uso tu ubicación actual para ordenar por distancia.',
        ['local_location']
      );
      return { handled: true };
    }

    // Nearest car query
    if (this.matchesNearestCarIntent(normalized)) {
      await this.respondWithNearestCar(text);
      return { handled: true };
    }

    // Follow-up short queries
    if (this.matchesFollowUpIntent(normalized)) {
      await this.respondWithNearestCar(text);
      return { handled: true };
    }

    // Account summary
    if (this.matchesAccountIntent(normalized)) {
      await this.respondWithAccountSummary(text);
      return { handled: true };
    }

    // Personal info (name, email, dni)
    const personalInfo = this.getPersonalInfoQueryKind(normalized);
    if (personalInfo) {
      await this.respondWithPersonalInfo(text, personalInfo);
      return { handled: true };
    }

    // Access limitations
    if (this.matchesAccessLimitationsIntent(normalized)) {
      await this.respondWithAccessLimitations(text);
      return { handled: true };
    }

    // Simple wallet queries (complex ones go to AI agent with Function Calling)
    const isComplexWalletQuestion = /(por que|porque|razon|motivo|explicar|explica|detalle|detalles|bloqueado|bloqueados|retenido|retenidos|liberan|liberar|devuelven|devolver)/.test(normalized);
    if (!isComplexWalletQuestion && /(mi wallet|mi billetera|saldo|balance|saldo disponible)/.test(normalized)) {
      await this.respondWithWalletSummary(text);
      return { handled: true };
    }

    // Navigation: open wallet
    if (/(abrir|ver|ir a).*(wallet|billetera)/.test(normalized)) {
      this.agentService.addLocalUserMessage(text);
      this.agentService.addLocalAgentMessage('Abriendo tu wallet.', ['local_navigation']);
      return { handled: true, navigateTo: '/wallet' };
    }

    // Quick booking: "alquilar el primero"
    if (/(alquilar|reservar|rentar).*(primero|primer auto|primera opcion|1)/.test(normalized)) {
      // Handled by capability service
      return { handled: false };
    }

    // My cars summary
    if (/(mis autos|mis vehículos|mis vehiculos|mis coches)/.test(normalized)) {
      await this.respondWithMyCarsSummary(text);
      return { handled: true };
    }

    // Navigation: my cars
    if (/(abrir|ver|ir a).*(mis autos|autos publicados|mis veh[ií]culos)/.test(normalized)) {
      this.agentService.addLocalUserMessage(text);
      this.agentService.addLocalAgentMessage('Abriendo tus autos.', ['local_navigation']);
      return { handled: true, navigateTo: '/cars/my' };
    }

    // Documents summary
    if (/(mis documentos|documentos|verificaci[oó]n|kyc|mi verificacion)/.test(normalized)) {
      await this.respondWithDocumentsSummary(text);
      return { handled: true };
    }

    // Nearby cars navigation
    if (/(autos?).*(cerca|cercanos|cercanas|m[aá]s cercanos|cerca de m[ií])/.test(normalized)) {
      const result = await this.navigateToNearbyCars(text);
      return result;
    }

    // Navigation: verification
    if (/(abrir|ver|ir a).*(documentos|verificaci[oó]n)/.test(normalized)) {
      this.agentService.addLocalUserMessage(text);
      this.agentService.addLocalAgentMessage('Abriendo verificación.', ['local_navigation']);
      return { handled: true, navigateTo: '/profile/verification' };
    }

    // Pickup preference
    const pickupPref = this.parsePickupPreference(normalized);
    if (pickupPref) {
      this.handlePickupPreference(text, pickupPref);
      return { handled: true };
    }

    return { handled: false };
  }

  // ========================================
  // Intent Matchers
  // ========================================

  private matchesVoiceHelpIntent(normalized: string): boolean {
    return /(no me escuch|no me entiende|no estas escuch|no est[aá]s escuch|microfono|micr[oó]fono|voz no funciona|no anda la voz)/.test(normalized);
  }

  private matchesBookingSearchIntent(normalized: string, originalText?: string): boolean {
    // If message contains a UUID, let the AI agent handle it (specific booking request)
    // Check original text because normalization removes hyphens from UUIDs
    const textToCheckUuid = originalText || normalized;
    if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(textToCheckUuid)) {
      return false;
    }
    return /(crear|hacer|iniciar).*(reserva|reservar)/.test(normalized) ||
           /(buscar|alquilar|rentar).*(auto|veh[ií]culo)/.test(normalized);
  }

  private matchesToolsIntent(normalized: string): boolean {
    return /(herramientas|que puedes hacer|qué puedes hacer|que podes hacer|qué podés hacer|capacidades)/.test(normalized);
  }

  private matchesNearestCarIntent(normalized: string): boolean {
    return /(cual|dime|diga|indica|indicame|indiqueme).*(mas cercan|cerca)/.test(normalized) ||
           /(el auto|un auto).*(mas cercan|cerca)/.test(normalized) ||
           /auto mas cerca/.test(normalized) ||
           /el mas cercano/.test(normalized);
  }

  private matchesFollowUpIntent(normalized: string): boolean {
    return /^(cual es|cual|indiqueme|indicame|dime cual|dimelo|muestra|mostrame|cual seria)\??$/.test(normalized.trim());
  }

  private matchesAccountIntent(normalized: string): boolean {
    return /(mi cuenta|mi perfil|quien soy|quién soy|estoy logueado|estoy logueada|mi usuario)/.test(normalized);
  }

  private matchesAccessLimitationsIntent(normalized: string): boolean {
    return /(a que no tenes acceso|a que no tienes acceso|que no tenes acceso|que no tienes acceso|no tenes acceso|no tienes acceso|limitaciones|privacidad)/.test(normalized);
  }

  // ========================================
  // Response Handlers
  // ========================================

  private async respondWithVoiceHelp(originalText: string): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    this.agentService.addLocalAgentMessage(
      [
        'Para hablarme: tocá el botón del micrófono y empezá a hablar.',
        'Si no arranca, el navegador puede estar bloqueando permisos de micrófono.',
        'Probá: permitir micrófono en el candadito del navegador y recargar la página.',
      ].join(' '),
      ['local_voice']
    );
  }

  private async handleCurrentLocation(text: string): Promise<void> {
    this.agentService.addLocalUserMessage(text);
    const location = await this.locationService.getLocationByChoice('current');

    if (location) {
      this.lastLocation = location;
      const nearestCarInfo = await this.getNearestCarInfo(location.lat, location.lng);
      const locationText = location.address
        ? `Tu ubicación es: ${location.address}.`
        : 'Tomé tu ubicación.';
      const response = nearestCarInfo ? `${locationText} ${nearestCarInfo}` : locationText;
      this.agentService.addLocalAgentMessage(response, ['local_location']);
    } else {
      const home = await this.locationService.getHomeLocation();
      if (home) {
        this.lastLocation = home;
        const nearestCarInfo = await this.getNearestCarInfo(home.lat, home.lng);
        const locationText = home.address
          ? `Uso tu ubicación guardada: ${home.address}.`
          : 'Uso tu ubicación guardada.';
        const response = nearestCarInfo ? `${locationText} ${nearestCarInfo}` : locationText;
        this.agentService.addLocalAgentMessage(response, ['local_location']);
      } else {
        this.agentService.addLocalAgentMessage(
          'No pude acceder a tu ubicación. ¿Podés habilitar permisos o decirme una dirección?',
          ['local_location']
        );
      }
    }
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
      'Decime "mi perfil", "mis autos", "mi wallet" o "mis documentos".',
    ].join('\n');

    this.agentService.addLocalAgentMessage(response, ['local_info']);
  }

  private async respondWithAccountSummary(originalText: string): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const msgId = this.agentService.addLocalAgentMessage('Estoy revisando tu cuenta...', ['local_profile']);

    const auth = await this.getAuthSnapshot();
    if (!auth) {
      this.agentService.updateMessageContent(msgId, 'No estás logueado. ¿Querés que abra la pantalla de login?', ['local_profile']);
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
        ['local_profile']
      );
    }
  }

  private async respondWithPersonalInfo(originalText: string, kind: PersonalInfoKind): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const auth = await this.getAuthSnapshot();
    if (!auth) {
      this.agentService.addLocalAgentMessage(
        'Para ver tus datos necesito que estés logueado. ¿Querés que abra el login?',
        ['local_profile']
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
        ['local_profile']
      );
      return;
    }

    if (kind === 'name') {
      const name = profile?.full_name?.trim();
      this.agentService.addLocalAgentMessage(
        name
          ? `Tu nombre (según tu perfil) es: ${name}.`
          : 'No veo tu nombre cargado en el perfil. Si querés, abrimos tu perfil para completarlo.',
        ['local_profile']
      );
      return;
    }

    const dniCandidate = profile?.gov_id_number ?? (profile as unknown as { dni?: string | null }).dni ?? null;
    if (!dniCandidate) {
      this.agentService.addLocalAgentMessage(
        'No tengo un DNI cargado/visible en tu perfil. Podés revisarlo o completarlo desde tu perfil.',
        ['local_profile']
      );
      return;
    }

    this.agentService.addLocalAgentMessage(
      `DNI (enmascarado): ${this.maskSensitiveNumber(dniCandidate)}.`,
      ['local_profile']
    );
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
    ].join('\n');

    this.agentService.addLocalAgentMessage(response, ['local_info']);
  }

  private async respondWithWalletSummary(originalText: string): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const msgId = this.agentService.addLocalAgentMessage('Consultando tu wallet...', ['local_wallet']);
    await this.fillWalletSummary(msgId);
  }

  async fillWalletSummary(messageId: string): Promise<void> {
    const auth = await this.getAuthSnapshot();
    if (!auth) {
      this.agentService.updateMessageContent(messageId, 'Necesitás iniciar sesión para ver tu wallet.', ['local_wallet']);
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
        ['local_wallet']
      );
    }
  }

  private async respondWithMyCarsSummary(originalText: string): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const msgId = this.agentService.addLocalAgentMessage('Buscando tus autos...', ['local_cars']);

    const auth = await this.getAuthSnapshot();
    if (!auth) {
      this.agentService.updateMessageContent(msgId, 'Necesitás iniciar sesión para ver tus autos.', ['local_cars']);
      return;
    }

    try {
      const cars = await this.carsService.listMyCars();
      if (!cars.length) {
        this.agentService.updateMessageContent(
          msgId,
          'No tenés autos publicados todavía. ¿Querés publicar uno ahora?',
          ['local_cars']
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
        '¿Querés abrir "Mis autos"?',
      ].filter(Boolean).join(' ');

      this.agentService.updateMessageContent(msgId, response, ['local_cars']);
    } catch {
      this.agentService.updateMessageContent(msgId, 'No pude cargar tus autos en este momento.', ['local_cars']);
    }
  }

  private async respondWithDocumentsSummary(originalText: string): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const msgId = this.agentService.addLocalAgentMessage('Revisando tus documentos...', ['local_documents']);

    const auth = await this.getAuthSnapshot();
    if (!auth) {
      this.agentService.updateMessageContent(msgId, 'Necesitás iniciar sesión para ver tus documentos.', ['local_documents']);
      return;
    }

    try {
      const docs = await this.verificationService.loadDocuments();
      if (!docs.length) {
        this.agentService.updateMessageContent(
          msgId,
          'No encuentro documentos cargados aún. ¿Querés ir a verificación?',
          ['local_documents']
        );
        return;
      }

      const counts = docs.reduce((acc, doc) => {
        acc[doc.status] = (acc[doc.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const response = [
        `Documentos: ${docs.length} en total.`,
        counts['verified'] ? `Verificados: ${counts['verified']}.` : '',
        counts['pending'] ? `En revisión: ${counts['pending']}.` : '',
        counts['rejected'] ? `Rechazados: ${counts['rejected']}.` : '',
        '¿Querés abrir la sección de verificación?',
      ].filter(Boolean).join(' ');

      this.agentService.updateMessageContent(msgId, response, ['local_documents']);
    } catch {
      this.agentService.updateMessageContent(msgId, 'No pude cargar tus documentos en este momento.', ['local_documents']);
    }
  }

  private async navigateToNearbyCars(originalText: string): Promise<IntentResult> {
    this.agentService.addLocalUserMessage(originalText);
    const msgId = this.agentService.addLocalAgentMessage('Buscando autos cercanos a tu ubicación...', ['local_nearby']);

    try {
      const location = this.lastLocation ?? (await this.locationService.getUserLocation());
      if (!location) {
        this.agentService.updateMessageContent(
          msgId,
          'Necesito tu ubicación para ordenar por distancia. Podés decir "usar ubicación actual" o indicar una dirección.',
          ['local_nearby']
        );
        return { handled: true };
      }

      this.lastLocation = location;
      this.persistLocationOverride(location);

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('autorenta:list-sort', 'distance');
      }

      this.agentService.updateMessageContent(msgId, 'Listo. Te muestro los autos más cercanos.', ['local_nearby']);

      return {
        handled: true,
        navigateTo: '/cars/list',
        queryParams: {
          sort: 'distance',
          nearby: '1',
          lat: String(location.lat),
          lng: String(location.lng),
        },
      };
    } catch {
      this.agentService.updateMessageContent(
        msgId,
        'No pude obtener tu ubicación. ¿Querés usar tu ubicación actual o decirme una dirección?',
        ['local_nearby']
      );
      return { handled: true };
    }
  }

  private async respondWithNearestCar(originalText: string): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const msgId = this.agentService.addLocalAgentMessage('Buscando el auto más cercano a tu ubicación...', ['local_nearby']);

    try {
      const location = this.lastLocation ?? (await this.locationService.getUserLocation());
      if (!location) {
        this.agentService.updateMessageContent(
          msgId,
          'Necesito tu ubicación para decirte cuál es el más cercano. Podés decir "usar ubicación actual" o indicar una dirección.',
          ['local_nearby']
        );
        return;
      }

      this.lastLocation = location;
      this.persistLocationOverride(location);

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

      const carsWithDistance = cars
        .filter((car) => car.location_lat && car.location_lng)
        .map((car) => ({
          ...car,
          distance_km: this.calculateDistanceKm(location.lat, location.lng, car.location_lat!, car.location_lng!),
        }))
        .sort((a, b) => a.distance_km - b.distance_km);

      const nearest = carsWithDistance[0];
      if (!nearest) {
        this.agentService.updateMessageContent(
          msgId,
          'No encontré autos cerca de tu ubicación. Te muestro el listado para que veas más opciones.',
          ['local_nearby']
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
      ].filter(Boolean).join(' ');

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
        ['local_nearby']
      );
    }
  }

  private handlePickupPreference(text: string, pickupPref: PickupPreference): void {
    this.agentService.addLocalUserMessage(text);
    this.lastPickupPreference = pickupPref.pickup;
    this.lastDropoffPreference = pickupPref.dropoff ?? pickupPref.pickup;
    if (pickupPref.addressHint) {
      this.lastAddressHint = pickupPref.addressHint;
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
  }

  private async createBookingFromCommand(originalText: string, command: BookingCommand): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const msgId = this.agentService.addLocalAgentMessage(
      `Creando tu reserva para ${command.startDate} → ${command.endDate}...`,
      ['local_booking']
    );

    const auth = await this.getAuthSnapshot();
    if (!auth) {
      this.agentService.updateMessageContent(
        msgId,
        'Necesitás iniciar sesión para crear una reserva. ¿Querés que abra el login?',
        ['local_booking']
      );
      return;
    }

    try {
      const result = await this.bookingsService.createBookingWithValidation(
        command.carId,
        command.startDate,
        command.endDate
      );

      if (!result.success || !result.booking) {
        this.agentService.updateMessageContent(
          msgId,
          result.error || 'No pude crear la reserva. Probá con otro auto o cambiá fechas.',
          ['local_booking']
        );
        return;
      }

      this.agentService.updateMessageContent(
        msgId,
        `Listo. Creé la reserva en tu cuenta (ID: ${result.booking.id}). Te llevo al pago/detalle.`,
        ['local_booking']
      );

      this.router.navigate(['/bookings', result.booking.id, 'detail-payment']);
    } catch {
      this.agentService.updateMessageContent(
        msgId,
        'Error al crear la reserva. Si el auto ya está reservado en esas fechas, probá con otras.',
        ['local_booking']
      );
    }
  }

  // ========================================
  // Parsing Helpers
  // ========================================

  private parseBookingCommand(text: string): BookingCommand | null {
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
    const isoMatches = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
    const dmyMatches = text.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g) ?? [];
    return [...isoMatches, ...dmyMatches];
  }

  private isIsoDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private normalizeToLocalDateString(value: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
      const [d, m, y] = value.split('/').map((v) => Number(v));
      if (!y || !m || !d) return value;
      return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    try {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    } catch {
      return value;
    }
  }

  parsePickupPreference(text: string): PickupPreference | null {
    const normalized = text.toLowerCase();
    const mentionsOwner =
      /(casa|domicilio).*(due[ñn]o|propietario|anfitri[oó]n)/.test(normalized) ||
      /(en la casa del due[ñn]o|en el domicilio del due[ñn]o)/.test(normalized);
    const mentionsSame =
      /(mismo lugar|misma direcci[oó]n|igual que lo retir(e|e)|igual que lo retiro)/.test(normalized);
    const mentionsAirport = /(aeropuerto|airport)/.test(normalized);
    const mentionsOffice = /(oficina|sucursal|centro)/.test(normalized);
    const mentionsHome = /(entrega a domicilio|retiro en domicilio|domicilio)/.test(normalized);

    if (mentionsOwner || mentionsHome) {
      return { pickup: 'owner_address', dropoff: mentionsSame ? 'owner_address' : undefined, sameLocation: mentionsSame };
    }
    if (mentionsAirport) {
      return { pickup: 'airport', dropoff: mentionsSame ? 'airport' : undefined, sameLocation: mentionsSame };
    }
    if (mentionsOffice) {
      return { pickup: 'office', dropoff: mentionsSame ? 'office' : undefined, sameLocation: mentionsSame };
    }
    return null;
  }

  getPersonalInfoQueryKind(normalized: string): PersonalInfoKind | null {
    if (/(mi nombre|como me llamo|cu[aá]l es mi nombre)/.test(normalized)) return 'name';
    if (/(mi email|mi correo|mi mail|cu[aá]l es mi correo|cu[aá]l es mi email)/.test(normalized)) return 'email';
    if (/(mi dni|mi documento|n[uú]mero de documento|documento nacional)/.test(normalized)) return 'dni';
    return null;
  }

  // ========================================
  // Location Helpers
  // ========================================

  wantsCurrentLocation(text: string): boolean {
    const normalized = this.normalizeInput(text);
    if (/(auto|autos|vehiculo|vehiculos|coche|coches)/.test(normalized)) return false;

    const mentionsLocationWord = /(ubic|ubica|ubicac|ubicaic|ubicaicon|ubication|ubicasion)/.test(normalized);
    const mentionsUse = /(usar|usa|usemos|dame|dime|quiero)/.test(normalized);
    const mentionsNow = /(actual|ahora|en este momento)/.test(normalized);
    const explicit =
      /ubicacion actual|usar mi ubicacion|usar ubicacion actual|mi ubicacion actual|mi ubicacion|cual es mi ubicacion|donde estoy/.test(normalized);

    if (mentionsUse && mentionsLocationWord) return true;
    return explicit || (mentionsLocationWord && mentionsNow);
  }

  looksLikeAddress(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.length < 8 || trimmed.length > 120) return false;
    return trimmed.includes(',') || trimmed.includes(' y ') || trimmed.includes(' & ');
  }

  async resolveLocationContext(text: string): Promise<LocationData | null> {
    const normalized = text.toLowerCase();

    if (this.wantsCurrentLocation(normalized)) {
      return await this.locationService.getLocationByChoice('current');
    }

    if (this.looksLikeAddress(normalized)) {
      try {
        const profile = this.profileStore.profile();
        const countryHint = profile?.country ?? 'AR';
        const result = await this.geocodingService.geocodeAddress(text, countryHint);
        return { lat: result.latitude, lng: result.longitude, source: 'address', address: result.fullAddress };
      } catch {
        // Fallback
      }
    }

    if (this.wantsLocationContext(normalized)) {
      const home = await this.locationService.getHomeLocation();
      if (home) return home;
      return await this.locationService.getCurrentPosition().then((loc) =>
        loc ? { ...loc, source: 'gps' } : null
      );
    }

    return await this.locationService.getHomeLocation();
  }

  private wantsLocationContext(text: string): boolean {
    return /ubicaci[oó]n|cerca|cercan|aqui|ac[aá]|estoy en|direcci[oó]n/.test(text);
  }

  persistLocationOverride(location: LocationData): void {
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

  async getNearestCarInfo(lat: number, lng: number): Promise<string | null> {
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
        typeof nearest.price_per_day === 'number' ? `${nearest.currency || 'USD'} ${nearest.price_per_day}/día` : '';

      return `El auto más cercano a ti es "${carTitle}" a ${distanceText}.${priceText ? ` Precio: ${priceText}.` : ''}`;
    } catch {
      return null;
    }
  }

  // ========================================
  // Utility Methods
  // ========================================

  normalizeInput(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async getAuthSnapshot(): Promise<{ id: string; email?: string } | null> {
    const session = await this.authService.ensureSession();
    const user = session?.user;
    if (!user?.id) return null;
    return { id: user.id, email: user.email ?? undefined };
  }

  formatMoney(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private maskSensitiveNumber(value: string): string {
    const raw = String(value).trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 0) return '***';
    if (digits.length <= 3) return `***${digits}`;
    return `***${digits.slice(-3)}`;
  }

  // ========================================
  // State Getters/Setters
  // ========================================

  getLastLocation(): LocationData | null {
    return this.lastLocation;
  }

  setLastLocation(location: LocationData | null): void {
    this.lastLocation = location;
  }

  getLastMarket(): { country?: string; city?: string } | null {
    return this.lastMarket;
  }

  getPickupPreferences(): { pickup: PickupPreference['pickup'] | null; dropoff: PickupPreference['dropoff'] | null; addressHint: string | null } {
    return {
      pickup: this.lastPickupPreference,
      dropoff: this.lastDropoffPreference,
      addressHint: this.lastAddressHint,
    };
  }
}
