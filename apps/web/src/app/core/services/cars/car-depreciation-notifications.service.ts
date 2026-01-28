import { Injectable, inject, signal } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { CarOwnerNotificationsService } from '@core/services/cars/car-owner-notifications.service';
import { CarsService } from '@core/services/cars/cars.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { AuthService } from '@core/services/auth/auth.service';

type CarWithEstimatedValue = {
  estimated_value_usd?: number | null;
};

/**
 * CarDepreciationNotificationsService
 *
 * Servicio para calcular y notificar sobre depreciación mensual de autos
 * y cómo contrarrestarla con ganancias de AutoRenta.
 *
 * Funcionalidades:
 * - Calcula depreciación mensual basada en categoría y edad del auto
 * - Calcula ganancias mensuales de reservas
 * - Envía notificaciones mensuales con reporte completo
 * - Sugiere optimizaciones de precio
 */
@Injectable({
  providedIn: 'root',
})
export class CarDepreciationNotificationsService {
  private readonly supabase = injectSupabase();
  private readonly carOwnerNotifications = inject(CarOwnerNotificationsService);
  private readonly carsService = inject(CarsService);
  private readonly bookingsService = inject(BookingsService);
  private readonly authService = inject(AuthService);

  // Track last notification date per car to avoid duplicates
  private readonly lastNotificationDate = signal<Map<string, Date>>(new Map());

  /**
   * Calcula la depreciación mensual de un auto
   *
   * @param car - Auto a calcular
   * @returns Depreciación mensual en ARS
   */
  async calculateMonthlyDepreciation(car: {
    id: string;
    year?: number | null;
    estimated_value_usd?: number | null;
    category_id?: string | null;
  }): Promise<number> {
    try {
      if (!car.year || !car.estimated_value_usd) {
        return 0;
      }

      // Obtener tasa de depreciación de la categoría
      let depreciationRate = 0.05; // Default 5% anual

      if (car.category_id) {
        const { data: category } = await this.supabase
          .from('vehicle_categories')
          .select('depreciation_rate_annual')
          .eq('id', car.category_id)
          .single();

        if (category?.depreciation_rate_annual) {
          depreciationRate = category.depreciation_rate_annual;
        }
      }

      // Calcular depreciación mensual
      // Depreciación mensual = (valor * tasa_anual) / 12
      const monthlyDepreciation = (car.estimated_value_usd * depreciationRate) / 12;

      // Convertir a ARS (asumiendo tipo de cambio, ajustar según tu sistema)
      // Por ahora retornamos en USD, se puede convertir después
      return monthlyDepreciation;
    } catch (error) {
      console.error('Error calculating depreciation:', error);
      return 0;
    }
  }

  /**
   * Calcula las ganancias mensuales de un auto
   *
   * @param carId - ID del auto
   * @param month - Mes a calcular (formato YYYY-MM)
   * @returns Ganancias mensuales en ARS
   */
  async calculateMonthlyEarnings(carId: string, month: string): Promise<number> {
    try {
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;

      // Obtener todas las reservas confirmadas/completadas del mes
      const { data: bookings, error } = await this.supabase
        .from('bookings')
        .select('total_amount, currency, status')
        .eq('car_id', carId)
        .in('status', ['confirmed', 'in_progress', 'completed'])
        .gte('start_date', startDate)
        .lte('start_date', endDate);

      if (error) {
        console.error('Error fetching bookings:', error);
        return 0;
      }

      // Modelo Comodato: 70% del booking va al pool de rewards de comunidad
      const totalEarnings = (bookings || []).reduce((sum, booking) => {
        if (booking.status === 'completed' || booking.status === 'active') {
          // Estimación: ~70% del total contribuye a rewards
          return sum + booking.total_amount * 0.70;
        }
        return sum;
      }, 0);

      return totalEarnings;
    } catch (error) {
      console.error('Error calculating earnings:', error);
      return 0;
    }
  }

  /**
   * Envía notificación mensual de depreciación para un auto
   *
   * @param carId - ID del auto
   */
  async sendMonthlyDepreciationNotification(carId: string): Promise<void> {
    try {
      const user = this.authService.session$()?.user;
      if (!user) return;

      // Verificar si ya se envió notificación este mes
      const lastNotification = this.lastNotificationDate().get(carId);
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      if (lastNotification) {
        const lastMonth = `${lastNotification.getFullYear()}-${String(lastNotification.getMonth() + 1).padStart(2, '0')}`;
        if (lastMonth === currentMonth) {
          // Ya se envió este mes
          return;
        }
      }

      // Obtener información del auto
      const car = await this.carsService.getCarById(carId);
      if (!car) return;

      // Calcular depreciación y ganancias
      const monthlyDepreciation = await this.calculateMonthlyDepreciation(car);
      const monthlyEarnings = await this.calculateMonthlyEarnings(carId, currentMonth);
      const netGain = monthlyEarnings - monthlyDepreciation;

      const carName = car.title || `${car.brand || ''} ${car.model || ''}`.trim() || 'tu auto';
      const carUrl = `/cars/${carId}`;
      const estimatedValueUsd = (car as CarWithEstimatedValue).estimated_value_usd ?? 0;

      // Enviar notificación
      this.carOwnerNotifications.notifyMonthlyDepreciation(
        carName,
        estimatedValueUsd,
        monthlyDepreciation,
        monthlyEarnings,
        netGain,
        carUrl,
      );

      // Actualizar fecha de última notificación
      const updatedMap = new Map(this.lastNotificationDate());
      updatedMap.set(carId, now);
      this.lastNotificationDate.set(updatedMap);

      // Si las ganancias son bajas, enviar notificación adicional
      if (monthlyEarnings < monthlyDepreciation * 0.5) {
        // Calcular precio recomendado (basado en análisis simple)
        const recommendedPrice = (car.price_per_day || 0) * 1.15; // Aumentar 15%

        this.carOwnerNotifications.notifyLowEarnings(
          carName,
          monthlyEarnings,
          recommendedPrice,
          carUrl,
        );
      } else if (netGain > monthlyDepreciation * 0.5) {
        // Si está ganando bien, enviar notificación positiva
        this.carOwnerNotifications.notifyExcellentEarnings(
          carName,
          monthlyEarnings,
          monthlyDepreciation,
          netGain,
        );
      }
    } catch (error) {
      console.error('Error sending depreciation notification:', error);
    }
  }

  /**
   * Envía notificaciones mensuales para todos los autos del usuario
   */
  async sendMonthlyNotificationsForAllCars(): Promise<void> {
    try {
      const user = this.authService.session$()?.user;
      if (!user) return;

      // Obtener todos los autos del usuario
      const cars = await this.carsService.listMyCars();

      // Enviar notificación para cada auto activo
      for (const car of cars) {
        if (car.status === 'active') {
          await this.sendMonthlyDepreciationNotification(car.id);
          // Pequeña pausa entre notificaciones para no saturar
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error('Error sending monthly notifications:', error);
    }
  }

  /**
   * Envía notificación educativa sobre cómo ganar dinero
   * Se puede llamar periódicamente o después de eventos específicos
   */
  async sendEarningTipsNotification(carId: string): Promise<void> {
    try {
      const car = await this.carsService.getCarById(carId);
      if (!car) return;

      const carName = car.title || `${car.brand || ''} ${car.model || ''}`.trim() || 'tu auto';

      // Tips personalizados basados en el estado del auto
      const tips: string[] = [];

      // Agregar tips según el estado
      if (!car.photos || car.photos.length < 5) {
        tips.push('Agrega más fotos profesionales para aumentar las reservas');
      }

      if (car.auto_approval === false) {
        tips.push('Activa la aprobación automática para cerrar reservas más rápido');
      }

      // Tips generales
      tips.push(
        'Aumenta tu precio en temporada alta para maximizar ganancias',
        'Mantén tu auto disponible los fines de semana (mayor demanda)',
        'Completa tu perfil y documentos para aumentar confianza',
        'Responde rápido a los mensajes para cerrar más reservas',
        'Usa fotos profesionales para destacar tu auto',
        'Ofrece descuentos por estadías largas para aumentar ocupación',
      );

      this.carOwnerNotifications.notifyHowToEarnMoney(carName, tips);
    } catch (error) {
      console.error('Error sending earning tips:', error);
    }
  }
}
