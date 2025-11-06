import { Injectable, inject, signal, computed } from '@angular/core';
import { injectSupabase } from './supabase-client.service';
import { DynamicPricingService } from './dynamic-pricing.service';
import { BookingsService } from './bookings.service';

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface UrgentRentalDefaults {
  duration: number; // horas
  pickup: 'immediate' | 'user_location';
  extras: string[];
  payment: 'immediate';
  userLocation?: UserLocation;
}

export interface UrgentRentalAvailability {
  available: boolean;
  distance?: number; // km
  eta?: number; // minutos
  reason?: string;
  batteryLevel?: number; // % (para autos eléctricos)
}

export interface UrgentRentalQuote {
  hourlyRate: number;
  totalPrice: number;
  duration: number;
  surgeFactor?: number;
  currency: string;
}

@Injectable({
  providedIn: 'root',
})
export class UrgentRentalService {
  private readonly supabase = injectSupabase();
  private readonly pricingService = inject(DynamicPricingService);
  private readonly bookingsService = inject(BookingsService);

  readonly userLocation = signal<UserLocation | null>(null);
  readonly locationLoading = signal(false);
  readonly locationError = signal<string | null>(null);

  /**
   * Obtener ubicación actual del usuario
   */
  async getCurrentLocation(): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no disponible en este navegador'));
        return;
      }

      this.locationLoading.set(true);
      this.locationError.set(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: UserLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          this.userLocation.set(location);
          this.locationLoading.set(false);
          resolve(location);
        },
        (error) => {
          const errorMessage = this.getGeolocationErrorMessage(error);
          this.locationError.set(errorMessage);
          this.locationLoading.set(false);
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // Cache por 1 minuto
        },
      );
    });
  }

  /**
   * Calcular distancia entre dos puntos (Haversine)
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calcular ETA (tiempo estimado de llegada) basado en distancia
   */
  calculateETA(distanceKm: number): number {
    // Asumir velocidad promedio de 30 km/h en ciudad
    const avgSpeedKmh = 30;
    return Math.ceil((distanceKm / avgSpeedKmh) * 60); // minutos
  }

  /**
   * Validar disponibilidad inmediata de un auto
   */
  async checkImmediateAvailability(carId: string): Promise<UrgentRentalAvailability> {
    try {
      const now = new Date();
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000); // +1 hora

      // Verificar disponibilidad usando RPC
      const { data: isAvailable, error } = await this.supabase.rpc('is_car_available', {
        p_car_id: carId,
        p_start_date: now.toISOString(),
        p_end_date: nextHour.toISOString(),
      });

      if (error) {
        return {
          available: false,
          reason: 'Error al verificar disponibilidad',
        };
      }

      if (!isAvailable) {
        return {
          available: false,
          reason: 'El auto no está disponible en este momento',
        };
      }

      // Obtener ubicación del auto
      const { data: car, error: carError } = await this.supabase
        .from('cars')
        .select('location_lat, location_lng')
        .eq('id', carId)
        .single();

      if (carError || !car.location_lat || !car.location_lng) {
        return {
          available: true, // Disponible pero sin ubicación
        };
      }

      // Calcular distancia si tenemos ubicación del usuario
      const userLoc = this.userLocation();
      let distance: number | undefined;
      let eta: number | undefined;

      if (userLoc) {
        distance = this.calculateDistance(
          userLoc.lat,
          userLoc.lng,
          car.location_lat,
          car.location_lng,
        );
        eta = this.calculateETA(distance);
      }

      return {
        available: true,
        distance,
        eta,
      };
    } catch (error) {
      console.error('Error checking immediate availability:', error);
      return {
        available: false,
        reason: 'Error al verificar disponibilidad',
      };
    }
  }

  /**
   * Obtener preselección de opciones para alquiler urgente
   */
  getUrgentDefaults(): UrgentRentalDefaults {
    return {
      duration: 5, // 5 horas mínimas
      pickup: 'immediate',
      extras: [], // Sin extras para simplificar
      payment: 'immediate',
      userLocation: this.userLocation() ?? undefined,
    };
  }

  /**
   * Calcular cotización para alquiler urgente (por hora)
   */
  async getUrgentQuote(
    carId: string,
    regionId: string,
    durationHours: number = 1,
  ): Promise<UrgentRentalQuote> {
    try {
      const now = new Date();
      const rentalEnd = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

      // Usar DynamicPricingService para calcular precio
      const pricing = await this.pricingService.calculatePrice({
        region_id: regionId,
        rental_start: now.toISOString(),
        rental_hours: durationHours,
        car_id: carId,
      });

      return {
        hourlyRate: pricing.price_per_hour,
        totalPrice: pricing.total_price,
        duration: durationHours,
        surgeFactor: pricing.breakdown.total_multiplier,
        currency: pricing.currency,
      };
    } catch (error) {
      console.error('Error calculating urgent quote:', error);
      throw new Error('No se pudo calcular el precio');
    }
  }

  /**
   * Crear reserva urgente (sin validación de fechas futuras)
   */
  async createUrgentBooking(
    carId: string,
    durationHours: number,
    userLocation?: UserLocation,
  ): Promise<{ success: boolean; bookingId?: string; error?: string }> {
    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

      const result = await this.bookingsService.createBookingWithValidation(
        carId,
        now.toISOString(),
        endTime.toISOString(),
      );

      if (!result.success || !result.booking) {
        return {
          success: false,
          error: result.error || 'No se pudo crear la reserva urgente',
        };
      }

      return {
        success: true,
        bookingId: result.booking.id,
      };
    } catch (error) {
      console.error('Error creating urgent booking:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear la reserva',
      };
    }
  }

  /**
   * Formatear distancia para mostrar
   */
  formatDistance(km: number): string {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  }

  /**
   * Formatear tiempo para mostrar
   */
  formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }

  // ═══════════════════════════════════════════════════════════════
  // MÉTODOS PRIVADOS
  // ═══════════════════════════════════════════════════════════════

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  private getGeolocationErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Permiso de ubicación denegado';
      case error.POSITION_UNAVAILABLE:
        return 'Ubicación no disponible';
      case error.TIMEOUT:
        return 'Tiempo de espera agotado';
      default:
        return 'Error al obtener ubicación';
    }
  }
}





