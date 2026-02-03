import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { Booking } from '../../../core/models';
import { AiChecklistPanelComponent } from '../../../shared/components/ai-checklist-panel/ai-checklist-panel.component';
import { AiLegalPanelComponent } from '../../../shared/components/ai-legal-panel/ai-legal-panel.component';
import { AiTripPanelComponent } from '../../../shared/components/ai-trip-panel/ai-trip-panel.component';
import { TripTimerComponent } from './components/trip-timer/trip-timer.component';
import { QuickActionsComponent } from './components/quick-actions/quick-actions.component';
import { EmergencyPanelComponent } from './components/emergency-panel/emergency-panel.component';
import { DigitalKeyComponent } from './components/digital-key/digital-key.component';

@Component({
  selector: 'app-active-rental',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    TripTimerComponent,
    QuickActionsComponent,
    EmergencyPanelComponent,
    DigitalKeyComponent,
    AiLegalPanelComponent,
    AiTripPanelComponent,
    AiChecklistPanelComponent,
  ],
  templateUrl: './active-rental.page.html',
  styleUrl: './active-rental.page.css',
})
export class ActiveRentalPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingsService = inject(BookingsService);
  private readonly authService = inject(AuthService);
  private readonly logger = inject(LoggerService).createChildLogger('ActiveRentalPage');

  // State
  readonly booking = signal<Booking | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly showEmergencyPanel = signal(false);

  // Owner info
  readonly ownerPhone = signal<string | null>(null);
  readonly ownerName = signal<string>('Propietario');

  // Car location (from tracking)
  readonly carLocation = signal<{ lat: number; lng: number } | null>(null);

  // AI Panels
  readonly expandedAiPanel = signal<'legal' | 'trip' | 'checklist' | null>(null);

  // Computed
  readonly carImageUrl = computed(() => {
    const booking = this.booking();
    return booking?.car_image || booking?.main_photo_url || '/assets/images/car-placeholder.webp';
  });

  readonly carTitle = computed(() => {
    const booking = this.booking();
    if (!booking) return '';
    return `${booking.car_brand} ${booking.car_model} ${booking.car_year || ''}`.trim();
  });

  readonly isActive = computed(() => {
    const booking = this.booking();
    return booking?.status === 'in_progress';
  });

  readonly startDate = computed(() => {
    const booking = this.booking();
    return booking ? new Date(booking.start_at) : null;
  });

  readonly endDate = computed(() => {
    const booking = this.booking();
    return booking ? new Date(booking.end_at) : null;
  });

  // Insurance info (static for now - could be enhanced with real data)
  readonly insuranceInfo = computed(() => {
    const booking = this.booking();
    if (!booking) return null;
    return {
      policyNumber: `AR-${new Date(booking.created_at).getFullYear()}-${booking.id.slice(0, 8).toUpperCase()}`,
      provider: 'AutoRenta Seguros',
      phone: '0800-333-RENT',
    };
  });

  async ngOnInit(): Promise<void> {
    const bookingId = this.route.snapshot.paramMap.get('id');
    if (!bookingId) {
      this.error.set('ID de reserva inválido');
      this.loading.set(false);
      return;
    }

    try {
      const booking = await this.bookingsService.getBookingById(bookingId);
      if (!booking) {
        this.error.set('Reserva no encontrada');
        this.loading.set(false);
        return;
      }

      // Verify booking is in_progress
      if (booking.status !== 'in_progress') {
        this.logger.warn('Booking not in progress, redirecting', { status: booking.status });
        this.router.navigate(['/bookings', bookingId]);
        return;
      }

      this.booking.set(booking);

      // Load owner info
      await this.loadOwnerInfo(booking.car_id);

      // Load car location from tracking (if available)
      await this.loadCarLocation(bookingId);
    } catch (err) {
      this.logger.error('Error loading booking', err);
      this.error.set('Error al cargar la reserva');
    } finally {
      this.loading.set(false);
    }
  }

  // ngOnDestroy not needed - using takeUntilDestroyed for subscriptions

  private async loadOwnerInfo(carId: string): Promise<void> {
    try {
      const { data: car } = await this.bookingsService['supabase']
        .from('cars')
        .select('owner:profiles!cars_owner_id_profiles_fkey(full_name, phone, whatsapp)')
        .eq('id', carId)
        .single();

      if (car?.owner) {
        const owner = car.owner as { full_name?: string; phone?: string; whatsapp?: string };
        this.ownerName.set(owner.full_name || 'Propietario');
        this.ownerPhone.set(owner.whatsapp || owner.phone || null);
      }
    } catch {
      // Silent fail - owner info is optional
    }
  }

  private async loadCarLocation(bookingId: string): Promise<void> {
    try {
      // Get latest tracking point
      const { data: session } = await this.bookingsService['supabase']
        .from('tracking_sessions')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('active', true)
        .single();

      if (!session) return;

      const { data: point } = await this.bookingsService['supabase']
        .from('tracking_points')
        .select('latitude, longitude')
        .eq('session_id', session.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (point) {
        this.carLocation.set({ lat: point.latitude, lng: point.longitude });
      }
    } catch {
      // Silent fail - location is optional
    }
  }

  // Actions
  toggleEmergencyPanel(): void {
    this.showEmergencyPanel.update((v) => !v);
  }

  onQuickAction(action: string): void {
    switch (action) {
      case 'locate':
        this.openCarLocation();
        break;
      case 'gas':
        this.openGasStations();
        break;
      case 'call':
        this.callOwner();
        break;
      case 'sos':
        this.showEmergencyPanel.set(true);
        break;
    }
  }

  private openCarLocation(): void {
    const location = this.carLocation();
    if (location) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`,
        '_blank',
      );
    } else {
      // Fallback to booking detail with tracking
      const booking = this.booking();
      if (booking) {
        this.router.navigate(['/bookings', booking.id], { fragment: 'tracking' });
      }
    }
  }

  private openGasStations(): void {
    const location = this.carLocation();
    if (location) {
      window.open(
        `https://www.google.com/maps/search/estacion+de+servicio/@${location.lat},${location.lng},14z`,
        '_blank',
      );
    } else {
      window.open('https://www.google.com/maps/search/estacion+de+servicio', '_blank');
    }
  }

  private callOwner(): void {
    const phone = this.ownerPhone();
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  }

  goBack(): void {
    const booking = this.booking();
    if (booking) {
      this.router.navigate(['/bookings', booking.id]);
    } else {
      this.router.navigate(['/bookings']);
    }
  }

  toggleAiPanel(panel: 'legal' | 'trip' | 'checklist'): void {
    this.expandedAiPanel.update((current) => (current === panel ? null : panel));
  }
}
