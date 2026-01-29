import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { BookingRealtimeService } from '@core/services/bookings/booking-realtime.service';
import { AuthService } from '@core/services/auth/auth.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { RenterProfileBadgeComponent } from '../../../shared/components/renter-profile-badge/renter-profile-badge.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { RenterAnalysisPanelComponent } from '../../../shared/components/renter-analysis-panel/renter-analysis-panel.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

interface PendingApproval {
  booking_id: string;
  car_id: string;
  car_name: string;
  car_year: number;
  renter_id: string;
  start_at: string;
  end_at: string;
  total_amount: number;
  currency: string;
  booking_created_at: string;
  approval_expires_at: string;
  hours_remaining: number;
  days_count: number;
}

@Component({
  selector: 'app-pending-approval',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    IonicModule,
    RenterProfileBadgeComponent,
    SkeletonLoaderComponent,
    RenterAnalysisPanelComponent,
    IconComponent,
  ],
  templateUrl: './pending-approval.page.html',
  styleUrl: './pending-approval.page.scss',
})
export class PendingApprovalPage implements OnInit, OnDestroy, ViewWillEnter {
  private readonly bookingsService = inject(BookingsService);
  private readonly bookingRealtimeService = inject(BookingRealtimeService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(NotificationManagerService);
  private readonly router = inject(Router);
  private pollInterval?: ReturnType<typeof setInterval>;
  private isInitialized = false;
  private currentUserId: string | null = null;

  readonly loading = signal(true);
  readonly pendingBookings = signal<PendingApproval[]>([]);
  readonly processingBookingId = signal<string | null>(null);
  // Inline reject form - se expande dentro de la card
  readonly rejectingBookingId = signal<string | null>(null);
  readonly rejectionReason = signal('');
  readonly customReason = signal('');
  readonly showAnalysisPanel = signal(false);
  readonly selectedAnalysisBooking = signal<PendingApproval | null>(null);

  @ViewChild('analysisPanel') analysisPanel?: RenterAnalysisPanelComponent;

  readonly hasBookings = computed(() => this.pendingBookings().length > 0);

  readonly rejectionReasons = [
    { value: 'dates_not_available', label: 'Fechas no disponibles' },
    { value: 'maintenance_required', label: 'Auto requiere mantenimiento' },
    { value: 'requirements_not_met', label: 'No cumple requisitos' },
    { value: 'other', label: 'Otra razón' },
  ];

  async ngOnInit() {
    await this.loadPendingApprovals();
    this.isInitialized = true;

    // Setup realtime subscription
    await this.setupRealtimeSubscription();

    // Polling como fallback (cada 60s en lugar de 30s gracias a realtime)
    this.pollInterval = setInterval(() => {
      if (!this.processingBookingId()) {
        this.loadPendingApprovals();
      }
    }, 60000);
  }

  private async setupRealtimeSubscription(): Promise<void> {
    try {
      const session = await this.authService.ensureSession();
      this.currentUserId = session?.user?.id ?? null;
      if (this.currentUserId) {
        this.bookingRealtimeService.subscribeToUserBookings(this.currentUserId, 'owner', {
          onBookingsChange: () => {
            if (!this.processingBookingId()) {
              void this.loadPendingApprovals();
            }
          },
        });
      }
    } catch {
      // Fallback a polling si realtime falla
    }
  }

  /**
   * FIX 2025-12-28: Reload data when returning to this page
   * This ensures fresh data after navigating back from other pages
   */
  ionViewWillEnter(): void {
    if (this.isInitialized) {
      void this.loadPendingApprovals();
    }
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    this.bookingRealtimeService.unsubscribeUserBookings();
  }

  async loadPendingApprovals() {
    try {
      this.loading.set(true);
      const bookings = await this.bookingsService.getPendingApprovals();
      this.pendingBookings.set(bookings as unknown as PendingApproval[]);
    } catch {
      this.toastService.error('Error', 'Error al cargar reservas pendientes');
    } finally {
      this.loading.set(false);
    }
  }

  async onApprove(bookingId: string) {
    if (this.processingBookingId()) return;

    // Process approval directly (no modal confirmation - follows project NO MODALS rule)
    this.processingBookingId.set(bookingId);

    try {
      const result = await this.bookingsService.approveBooking(bookingId);

      if (result.success) {
        this.toastService.success('Éxito', '✅ Reserva aprobada exitosamente');
        await this.loadPendingApprovals();
      } else {
        this.toastService.error('Error', `Error: ${result.error}`);
      }
    } catch {
      this.toastService.error('Error', 'Error al aprobar reserva');
    } finally {
      this.processingBookingId.set(null);
    }
  }

  onRejectClick(bookingId: string) {
    // Si ya está abierto para otro booking, cerrarlo primero
    if (this.rejectingBookingId() && this.rejectingBookingId() !== bookingId) {
      this.onCancelReject();
    }
    this.rejectingBookingId.set(bookingId);
    this.rejectionReason.set('');
    this.customReason.set('');
  }

  async onConfirmReject() {
    const bookingId = this.rejectingBookingId();
    let reason = this.rejectionReason();

    // Si eligió "other", usar la razón personalizada
    if (reason === 'other') {
      reason = this.customReason() || 'Otra razón';
    }

    if (!bookingId || !reason) {
      this.toastService.warning('Advertencia', 'Por favor selecciona una razón');
      return;
    }

    this.processingBookingId.set(bookingId);

    try {
      const result = await this.bookingsService.rejectBooking(bookingId, reason);

      if (result.success) {
        this.toastService.success('Éxito', 'Reserva rechazada. Se notificará al cliente.');
        this.onCancelReject();
        await this.loadPendingApprovals();
      } else {
        this.toastService.error('Error', `Error: ${result.error}`);
      }
    } catch {
      this.toastService.error('Error', 'Error al rechazar reserva');
    } finally {
      this.processingBookingId.set(null);
    }
  }

  onCancelReject() {
    this.rejectingBookingId.set(null);
    this.rejectionReason.set('');
    this.customReason.set('');
  }

  getUrgencyClass(hoursRemaining: number): string {
    if (hoursRemaining < 4) return 'urgent';
    if (hoursRemaining < 12) return 'warning';
    return 'normal';
  }

  formatTimeRemaining(hoursRemaining: number): string {
    if (hoursRemaining < 0) return 'Expirado';
    if (hoursRemaining < 1) return `${Math.floor(hoursRemaining * 60)} min`;
    if (hoursRemaining < 24) return `${Math.floor(hoursRemaining)}h`;
    return `${Math.floor(hoursRemaining / 24)}d ${Math.floor(hoursRemaining % 24)}h`;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  navigateToBooking(bookingId: string) {
    this.router.navigate(['/bookings/owner', bookingId]);
  }

  // Análisis del renter
  openAnalysisPanel(booking: PendingApproval): void {
    this.selectedAnalysisBooking.set(booking);
    this.showAnalysisPanel.set(true);
    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';
  }

  closeAnalysisPanel(): void {
    this.showAnalysisPanel.set(false);
    this.selectedAnalysisBooking.set(null);
    document.body.style.overflow = '';
    // Reset el estado del componente si existe
    this.analysisPanel?.resetApproving();
  }

  async onAnalysisApprove(): Promise<void> {
    const booking = this.selectedAnalysisBooking();
    if (!booking) return;

    // Process approval directly (no modal confirmation - follows project NO MODALS rule)
    this.processingBookingId.set(booking.booking_id);

    try {
      const result = await this.bookingsService.approveBooking(booking.booking_id);

      if (result.success) {
        this.toastService.success('Éxito', '✅ Reserva aprobada exitosamente');
        this.closeAnalysisPanel();
        await this.loadPendingApprovals();
      } else {
        this.toastService.error('Error', `Error: ${result.error}`);
        this.analysisPanel?.resetApproving();
      }
    } catch {
      this.toastService.error('Error', 'Error al aprobar reserva');
      this.analysisPanel?.resetApproving();
    } finally {
      this.processingBookingId.set(null);
    }
  }

  onAnalysisReject(): void {
    const booking = this.selectedAnalysisBooking();
    if (!booking) return;

    // Cerrar panel de análisis y abrir formulario inline de rechazo
    this.closeAnalysisPanel();
    // Pequeño delay para que el usuario vea la transición
    setTimeout(() => this.onRejectClick(booking.booking_id), 100);
  }
}
