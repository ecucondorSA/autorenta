import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ChatSuggestion, RentarfastAgentService } from '@core/services/ai/rentarfast-agent.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { CarsService } from '@core/services/cars/cars.service';
import { LocationData, LocationService } from '@core/services/geo/location.service';
import { WalletService } from '@core/services/payments/wallet.service';
import { ProfileStore } from '@core/stores/profile.store';
import { RentarfastIntentService } from './rentarfast-intent.service';
import { CapabilityAction, NearestCarInfo } from './rentarfast.models';

// Re-export for convenience
export type { CapabilityAction } from './rentarfast.models';

/**
 * Service that handles capability button actions for the Rentarfast chatbot.
 * Extracts ~400 lines of logic from RentarfastPage for better maintainability.
 */
@Injectable({ providedIn: 'root' })
export class RentarfastCapabilityService {
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);
  private readonly agentService = inject(RentarfastAgentService);
  private readonly locationService = inject(LocationService);
  private readonly profileStore = inject(ProfileStore);
  private readonly walletService = inject(WalletService);
  private readonly carsService = inject(CarsService);
  private readonly bookingsService = inject(BookingsService);
  private readonly intentService = inject(RentarfastIntentService);

  private readonly NEAREST_CAR_KEY = 'rentarfast:nearest_car';

  /**
   * Dispatcher for capability button clicks
   */
  async onCapabilityClick(action: CapabilityAction): Promise<void> {
    switch (action) {
      case 'search_cars':
        await this.searchNearbyCars();
        break;
      case 'calculate_price':
        await this.calculatePrice();
        break;
      case 'stats':
        await this.showStats();
        break;
      case 'help':
        await this.showHelp();
        break;
    }
  }

  /** @deprecated Use onCapabilityClick instead */
  handleCapability(action: CapabilityAction): Promise<void> {
    return this.onCapabilityClick(action);
  }

  /**
   * Search for the 3 nearest cars with geolocation
   * Shows car details with option to rent the first one for 3 days
   */
  async searchNearbyCars(): Promise<void> {
    this.agentService.addLocalUserMessage('Buscar autos disponibles cerca de mí');
    const msgId = this.agentService.addLocalAgentMessage('Obteniendo tu ubicación...', ['local_nearby']);

    try {
      let location = this.intentService.getLastLocation();
      if (!location) {
        location = await this.locationService.getLocationByChoice('current');
      }

      if (!location) {
        this.agentService.updateMessageContent(
          msgId,
          'Necesito tu ubicación para encontrar autos cercanos.\n\nPor favor, permite el acceso a tu ubicación en el navegador o decime una dirección.',
          ['local_nearby']
        );
        return;
      }

      this.intentService.setLastLocation(location);
      this.intentService.persistLocationOverride(location);

      this.agentService.updateMessageContent(
        msgId,
        `Ubicación: ${location.address || 'Obtenida'}\nBuscando autos cercanos...`,
        ['local_nearby']
      );

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
          distance_km: this.intentService.calculateDistanceKm(
            location!.lat,
            location!.lng,
            car.location_lat!,
            car.location_lng!
          ),
        }))
        .sort((a, b) => a.distance_km - b.distance_km)
        .slice(0, 3);

      if (carsWithDistance.length === 0) {
        this.agentService.updateMessageContent(
          msgId,
          'No encontré autos disponibles cerca de tu ubicación.\n\n¿Querés que busque en toda la plataforma?',
          ['local_nearby']
        );
        return;
      }

      const carsList = carsWithDistance
        .map((car, index) => {
          const title = car.title || `${car.brand} ${car.model}`;
          const distance = `${car.distance_km.toFixed(1)} km`;
          const price = car.price_per_day
            ? `${car.currency || 'USD'} ${car.price_per_day}/día`
            : 'Consultar precio';
          const city = car.location_city || car.location_state || '';
          return `${index + 1}. **${title}**\n   ${distance} - ${city}\n   ${price}`;
        })
        .join('\n\n');

      const firstCar = carsWithDistance[0];
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 3);
      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Generate interactive suggestions (Supabase chatbot style)
      const suggestions: ChatSuggestion[] = carsWithDistance.map((car, index) => {
        const title = car.title || `${car.brand} ${car.model}`;
        const price = car.price_per_day ? `$${car.price_per_day}/día` : '';
        const city = car.location_city ? ` - ${car.location_city}` : '';
        return {
          label: `${title} ${price}${city}`,
          action: `reservar ${car.id} ${startDateStr} ${endDateStr}`,
          icon: '🚗',
        };
      });

      this.agentService.updateMessageContent(
        msgId,
        `**Los ${carsWithDistance.length} autos más cercanos:**\n\n${carsList}\n\nTocá un botón para reservar por 3 días:`,
        ['local_nearby', 'search_cars'],
        suggestions
      );

      this.storeNearestCar({
        id: firstCar.id,
        title: firstCar.title || `${firstCar.brand} ${firstCar.model}`,
        price_per_day: firstCar.price_per_day ?? 0,
        currency: firstCar.currency || 'USD',
      });
    } catch (error) {
      this.logger.error('[RentarfastCapability] Error searching nearby cars', error);
      this.agentService.updateMessageContent(
        msgId,
        'No pude obtener tu ubicación. Por favor, habilitá los permisos de ubicación o decime una dirección.',
        ['local_nearby']
      );
    }
  }

  /**
   * Calculate rental price for the nearest car for different periods
   */
  async calculatePrice(): Promise<void> {
    this.agentService.addLocalUserMessage('Calcular precios de alquiler');
    const msgId = this.agentService.addLocalAgentMessage('Calculando precios...', ['local_pricing']);

    const storedCar = this.getStoredNearestCar();

    if (!storedCar) {
      this.agentService.updateMessageContent(
        msgId,
        'Primero necesito buscar autos disponibles.\n\nTocá "Buscar autos disponibles" para ver opciones cerca tuyo, o decime qué auto te interesa.',
        ['local_pricing']
      );
      return;
    }

    const today = new Date();
    const pricePerDay = storedCar.price_per_day || 0;
    const currency = storedCar.currency || 'USD';

    if (pricePerDay === 0) {
      this.agentService.updateMessageContent(
        msgId,
        `No hay precio disponible para **${storedCar.title}**.\n\nContactá al propietario para conocer el precio.`,
        ['local_pricing']
      );
      return;
    }

    const prices = [
      { days: 1, total: pricePerDay },
      { days: 3, total: pricePerDay * 3 },
      { days: 7, total: pricePerDay * 7 },
      { days: 30, total: pricePerDay * 30 },
    ];

    const priceList = prices
      .map((p) => `• ${p.days} día${p.days > 1 ? 's' : ''}: **${currency} ${p.total.toFixed(0)}**`)
      .join('\n');

    const endDate3Days = new Date(today);
    endDate3Days.setDate(today.getDate() + 3);

    this.agentService.updateMessageContent(
      msgId,
      `**Precios para ${storedCar.title}:**\n\n${priceList}\n\nPara reservar por 3 días desde hoy:\nDecí "alquilar el primero" o "reservar ${storedCar.id} ${today.toISOString().split('T')[0]} ${endDate3Days.toISOString().split('T')[0]}"`,
      ['local_pricing', 'calculate_price']
    );
  }

  /**
   * Show user statistics (bookings, earnings, etc.)
   */
  async showStats(): Promise<void> {
    this.agentService.addLocalUserMessage('Ver estadísticas');
    const msgId = this.agentService.addLocalAgentMessage('Cargando estadísticas...', ['local_stats']);

    const auth = await this.intentService.getAuthSnapshot();
    if (!auth) {
      this.agentService.updateMessageContent(
        msgId,
        'Necesitás iniciar sesión para ver tus estadísticas.\n\n¿Querés que abra el login?',
        ['local_stats']
      );
      return;
    }

    try {
      const { bookings: renterBookings } = await this.bookingsService.getMyBookings({ limit: 100 });
      const completedRentals = renterBookings.filter((b) => b.status === 'completed').length;
      const activeRentals = renterBookings.filter(
        (b) => b.status === 'in_progress' || b.status === 'confirmed'
      ).length;
      const pendingRentals = renterBookings.filter((b) => b.status === 'pending').length;

      const myCars = await this.carsService.listMyCars();
      const publishedCars = myCars.filter((c) => c.status === 'active').length;

      let walletInfo = '';
      try {
        const balance = await this.walletService.fetchBalance(true);
        walletInfo = `\n\n**Wallet:**\n• Disponible: ${balance.currency || 'USD'} ${balance.available_balance.toFixed(2)}\n• Bloqueado: ${balance.currency || 'USD'} ${balance.locked_balance.toFixed(2)}`;
      } catch (error) {
        this.logger.warn('[RentarfastCapability] Could not fetch wallet balance', error);
        walletInfo = '\n\nWallet: No disponible';
      }

      const profile = this.profileStore.profile();
      const userName = profile?.full_name || 'Usuario';

      this.agentService.updateMessageContent(
        msgId,
        `**Estadísticas de ${userName}:**\n\n` +
          `**Como arrendatario:**\n` +
          `• Alquileres completados: ${completedRentals}\n` +
          `• Alquileres activos: ${activeRentals}\n` +
          `• Pendientes: ${pendingRentals}\n\n` +
          `**Como propietario:**\n` +
          `• Autos publicados: ${publishedCars}/${myCars.length}` +
          walletInfo,
        ['local_stats', 'stats']
      );
    } catch (error) {
      this.logger.error('[RentarfastCapability] Error loading stats', error);
      this.agentService.updateMessageContent(
        msgId,
        'Error al cargar estadísticas. Intentalo de nuevo.',
        ['local_stats']
      );
    }
  }

  /**
   * Show help/capabilities summary
   */
  async showHelp(): Promise<void> {
    this.agentService.addLocalUserMessage('¿Qué puedo hacer?');

    const auth = await this.intentService.getAuthSnapshot();
    const loginStatus = auth ? 'Estás logueado' : 'No estás logueado (algunas funciones requieren login)';

    this.agentService.addLocalAgentMessage(
      `**Soy Rentarfast, tu asistente de AutoRentar**\n\n${loginStatus}\n\n` +
        `**Puedo ayudarte con:**\n\n` +
        `**Buscar autos:**\n• "Buscar autos cerca de mí"\n• "Mostrar el auto más cercano"\n• "Autos en Buenos Aires"\n\n` +
        `**Precios y reservas:**\n• "Calcular precio por 3 días"\n• "Alquilar el primero"\n• "Reservar [auto] del [fecha] al [fecha]"\n\n` +
        `**Tu cuenta:**\n• "Mi wallet" / "Mi saldo"\n• "Mis reservas"\n• "Mis autos"\n• "Mi perfil"\n\n` +
        `**Acciones rápidas:**\n• "Publicar un auto"\n• "Ver documentos"\n• "Abrir verificación"\n\n` +
        `También podés hablarme usando el micrófono.`,
      ['local_help', 'help']
    );
  }

  /**
   * Book the first/nearest car for 3 days starting today
   */
  async bookFirstCar(originalText: string): Promise<void> {
    this.agentService.addLocalUserMessage(originalText);
    const msgId = this.agentService.addLocalAgentMessage('Preparando tu reserva...', ['local_booking']);

    const auth = await this.intentService.getAuthSnapshot();
    if (!auth) {
      this.agentService.updateMessageContent(
        msgId,
        'Necesitás iniciar sesión para hacer una reserva.\n\n¿Querés que abra el login?',
        ['local_booking']
      );
      return;
    }

    const storedCar = this.getStoredNearestCar();

    if (!storedCar) {
      this.agentService.updateMessageContent(
        msgId,
        'Primero necesito buscar autos disponibles.\n\nTocá "Buscar autos disponibles" para ver opciones cerca tuyo.',
        ['local_booking']
      );
      return;
    }

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 3);
    const startDateStr = today.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const pricePerDay = storedCar.price_per_day || 0;
    const totalPrice = pricePerDay * 3;

    this.agentService.updateMessageContent(
      msgId,
      `**Reservando ${storedCar.title}**\n\nDel ${startDateStr} al ${endDateStr} (3 días)\nTotal estimado: ${storedCar.currency} ${totalPrice.toFixed(0)}\n\nCreando reserva...`,
      ['local_booking']
    );

    try {
      const result = await this.bookingsService.createBookingWithValidation(
        storedCar.id,
        startDateStr,
        endDateStr
      );

      if (!result.success || !result.booking) {
        this.agentService.updateMessageContent(
          msgId,
          `${result.error || 'No pude crear la reserva.'}\n\nPosibles causas:\n• El auto no está disponible en esas fechas\n• Ya tenés una reserva activa con este auto\n\n¿Querés buscar otros autos?`,
          ['local_booking']
        );
        return;
      }

      this.agentService.updateMessageContent(
        msgId,
        `**Reserva creada exitosamente**\n\n${storedCar.title}\n${startDateStr} → ${endDateStr}\nTotal: ${storedCar.currency} ${totalPrice.toFixed(0)}\n\nTe llevo al pago para confirmar tu reserva...`,
        ['local_booking', 'booking_created']
      );

      this.clearStoredNearestCar();

      setTimeout(() => {
        this.router.navigate(['/bookings', result.booking!.id, 'detail-payment']);
      }, 1500);
    } catch (error) {
      this.logger.error('[RentarfastCapability] Error creating booking', error);
      this.agentService.updateMessageContent(
        msgId,
        'Error al crear la reserva. El auto puede no estar disponible en esas fechas.\n\n¿Querés buscar otros autos disponibles?',
        ['local_booking']
      );
    }
  }

  // ========================================
  // Storage Helpers
  // ========================================

  private storeNearestCar(car: NearestCarInfo): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(this.NEAREST_CAR_KEY, JSON.stringify(car));
    }
  }

  private getStoredNearestCar(): NearestCarInfo | null {
    if (typeof sessionStorage === 'undefined') return null;
    const stored = sessionStorage.getItem(this.NEAREST_CAR_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch (error) {
      this.logger.warn('[RentarfastCapability] Failed to parse stored car', error);
      this.clearStoredNearestCar();
      return null;
    }
  }

  private clearStoredNearestCar(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(this.NEAREST_CAR_KEY);
    }
  }
}
