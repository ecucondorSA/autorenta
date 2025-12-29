import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { Booking } from '../../../core/models';
import { BookingChatComponent } from '../../../shared/components/booking-chat/booking-chat.component';
import {
  BookingPricingBreakdownComponent,
  PricingBreakdownInput,
} from '../../../shared/components/booking-pricing-breakdown/booking-pricing-breakdown.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';

interface ReturnChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

@Component({
  selector: 'app-owner-booking-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonicModule,
    RouterLink,
    BookingChatComponent,
    BookingPricingBreakdownComponent,
    ErrorStateComponent,
  ],
  templateUrl: './owner-booking-detail.page.html',
  styleUrl: './owner-booking-detail.page.css',
})
export class OwnerBookingDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingsService = inject(BookingsService);
  private readonly authService = inject(AuthService);
  private readonly alertController = inject(AlertController);
  private readonly toastService = inject(NotificationManagerService);

  readonly booking = signal<Booking | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly processing = signal(false);
  readonly renterVerification = signal<RenterVerification | null>(null);
  readonly renterLoading = signal(false);

  readonly renterName = computed(() => this.booking()?.renter_name || 'Locatario');
  readonly renterAvatar = computed(() => this.booking()?.renter_avatar || null);

  readonly renterReturnChecklist = computed<ReturnChecklistItem[]>(() => {
    const booking = this.booking();
    const raw = booking?.metadata?.['return_checklist'];
    if (!Array.isArray(raw)) return [];
    return raw.filter((item) => item && typeof item.id === 'string') as ReturnChecklistItem[];
  });

  readonly renterReturnChecklistProgress = computed(() => {
    const items = this.renterReturnChecklist();
    if (items.length === 0) return { completed: 0, total: 0 };
    const completed = items.filter((i) => i.checked).length;
    return { completed, total: items.length };
  });

  readonly shouldShowReturnChecklist = computed(() => {
    const status = this.booking()?.status;
    return status === 'in_progress' || status === 'pending_review' || status === 'completed';
  });

  readonly canApprove = computed(() => this.booking()?.status === 'pending');
  readonly canOwnerCheckIn = computed(() => this.booking()?.status === 'confirmed');
  readonly canOwnerCheckOut = computed(() => this.booking()?.status === 'in_progress');

  readonly pricingView = computed<PricingBreakdownInput | null>(() => {
    const booking = this.booking();
    if (!booking) return null;

    return {
      nightlyRate: (booking.nightly_rate_cents ?? 0) / 100,
      nights: booking.days_count ?? 1,
      fees: (booking.fees_cents ?? 0) / 100,
      discounts: (booking.discounts_cents ?? 0) / 100,
      insurance: (booking.insurance_cents ?? 0) / 100,
      total: (booking.total_cents ?? booking.subtotal_cents ?? 0) / 100,
      currency: 'ARS' as const,
    };
  });

  readonly driverScore = computed(() => this.renterVerification()?.driver_score ?? null);
  readonly driverClass = computed(() => this.renterVerification()?.driver_class ?? null);
  readonly classDescription = computed(() => this.renterVerification()?.class_description ?? null);
  readonly feeMultiplier = computed(() => this.renterVerification()?.fee_multiplier ?? null);
  readonly guaranteeMultiplier = computed(() => this.renterVerification()?.guarantee_multiplier ?? null);

  readonly renterPhone = computed(() => this.renterVerification()?.phone ?? null);
  readonly renterWhatsApp = computed(() => this.renterVerification()?.whatsapp ?? null);
  readonly renterDni = computed(() => this.renterVerification()?.gov_id_number ?? null);
  readonly renterDniType = computed(() => this.renterVerification()?.gov_id_type ?? 'DNI');
  readonly renterLicenseCountry = computed(
    () => this.renterVerification()?.driver_license_country ?? null,
  );
  readonly renterLicenseExpiry = computed(
    () => this.renterVerification()?.driver_license_expiry ?? null,
  );
  readonly renterLicenseClass = computed(() => this.renterVerification()?.driver_license_class ?? null);
  readonly renterLicenseProfessional = computed(
    () => this.renterVerification()?.driver_license_professional ?? null,
  );
  readonly renterLicensePoints = computed(
    () => this.renterVerification()?.driver_license_points ?? null,
  );

  readonly emailVerified = computed(() => this.renterVerification()?.email_verified ?? null);
  readonly phoneVerified = computed(() => this.renterVerification()?.phone_verified ?? null);
  readonly idVerified = computed(() => this.renterVerification()?.id_verified ?? null);
  readonly licenseVerified = computed(
    () => this.renterVerification()?.driver_license_verified_at ?? null,
  );

  readonly videoCallUrl = computed(() => {
    const booking = this.booking();
    if (!booking) return null;
    return `https://meet.jit.si/autorenta-${booking.id}`;
  });

  async ngOnInit() {
    const bookingId = this.route.snapshot.paramMap.get('id');
    if (!bookingId) {
      this.error.set('ID de reserva inválido');
      this.loading.set(false);
      return;
    }

    await this.loadBooking(bookingId);
  }

  private async loadBooking(bookingId: string): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);

      const session = await this.authService.ensureSession();
      const currentUserId = session?.user?.id ?? null;
      if (!currentUserId) {
        this.error.set('No se encontró sesión activa');
        return;
      }

      const booking = await this.bookingsService.getOwnerBookingById(bookingId);
      if (!booking) {
        this.error.set('Reserva no encontrada');
        return;
      }

      // Validar propietario
      const { data: car } = await this.bookingsService['supabase']
        .from('cars')
        .select('owner_id')
        .eq('id', booking.car_id)
        .single();

      if (!car?.owner_id || car.owner_id !== currentUserId) {
        this.error.set('No tienes permiso para ver esta reserva');
        return;
      }

      this.booking.set(booking);
      await this.loadRenterVerification(booking.id);
    } catch {
      this.error.set('Error al cargar la reserva');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadRenterVerification(bookingId: string): Promise<void> {
    try {
      this.renterLoading.set(true);
      const data = await this.bookingsService.getRenterVerificationForOwner(bookingId);
      if (!data) {
        this.renterVerification.set(null);
        return;
      }
      this.renterVerification.set(data as RenterVerification);
    } catch {
      this.renterVerification.set(null);
    } finally {
      this.renterLoading.set(false);
    }
  }

  statusLabel(status?: string): string {
    switch (status) {
      case 'pending':
        return 'Pendiente de aprobación';
      case 'confirmed':
        return 'Confirmada';
      case 'in_progress':
        return 'En curso';
      case 'completed':
        return 'Finalizada';
      case 'cancelled':
        return 'Cancelada';
      case 'expired':
        return 'Vencida';
      default:
        return status || 'Desconocido';
    }
  }

  async approveBooking(): Promise<void> {
    const booking = this.booking();
    if (!booking || this.processing()) return;

    try {
      this.processing.set(true);
      const result = await this.bookingsService.approveBooking(booking.id);
      if (!result.success) {
        this.toastService.error('Error', result.error || 'No se pudo aprobar la reserva');
        return;
      }
      this.toastService.success('Reserva aprobada', result.message || 'La reserva fue aprobada');
      await this.loadBooking(booking.id);
    } catch {
      this.toastService.error('Error', 'No se pudo aprobar la reserva');
    } finally {
      this.processing.set(false);
    }
  }

  async rejectBooking(): Promise<void> {
    const booking = this.booking();
    if (!booking || this.processing()) return;

    const alert = await this.alertController.create({
      header: 'Rechazar reserva',
      message: 'Podés agregar un motivo opcional para el locatario.',
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'Motivo (opcional)',
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Rechazar',
          role: 'confirm',
          handler: async (data) => {
            try {
              this.processing.set(true);
              const result = await this.bookingsService.rejectBooking(booking.id, data?.reason);
              if (!result.success) {
                this.toastService.error('Error', result.error || 'No se pudo rechazar la reserva');
                return;
              }
              this.toastService.success(
                'Reserva rechazada',
                result.message || 'La reserva fue rechazada',
              );
              await this.loadBooking(booking.id);
            } catch {
              this.toastService.error('Error', 'No se pudo rechazar la reserva');
            } finally {
              this.processing.set(false);
            }
          },
        },
      ],
    });

    await alert.present();
  }

  goBack(): void {
    this.router.navigate(['/bookings/owner']);
  }

  docStatus(kind: RenterDocumentKind): RenterDocumentStatus {
    const doc = this.findDoc(kind);
    if (!doc) return { label: 'Faltante', tone: 'danger' };
    if (doc.status === 'verified') return { label: 'Verificado', tone: 'success' };
    if (doc.status === 'rejected') return { label: 'Rechazado', tone: 'danger' };
    return { label: 'Pendiente', tone: 'warning' };
  }

  residenceDocStatus(): RenterDocumentStatus {
    const doc = this.findDoc('utility_bill');
    if (!doc) return { label: 'Faltante', tone: 'danger' };
    if (doc.status !== 'verified') return { label: 'Pendiente', tone: 'warning' };
    if (!doc.created_at) return { label: 'Verificado', tone: 'success' };
    const ageDays = Math.floor((Date.now() - new Date(doc.created_at).getTime()) / 86400000);
    if (ageDays <= 90) return { label: 'Vigente', tone: 'success' };
    return { label: 'Vencido', tone: 'danger' };
  }

  private findDoc(kind: RenterDocumentKind): RenterDocument | null {
    const docs = this.renterVerification()?.documents ?? [];
    return docs.find((d) => d.kind === kind) ?? null;
  }
}

type RenterDocumentKind =
  | 'gov_id_front'
  | 'gov_id_back'
  | 'driver_license'
  | 'license_front'
  | 'license_back'
  | 'utility_bill'
  | 'selfie'
  | 'criminal_record';

type RenterDocument = {
  kind: RenterDocumentKind;
  status: 'not_started' | 'pending' | 'verified' | 'rejected';
  created_at: string | null;
  reviewed_at: string | null;
};

type RenterVerification = {
  renter_id: string;
  full_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  gov_id_type: string | null;
  gov_id_number: string | null;
  driver_license_country: string | null;
  driver_license_expiry: string | null;
  driver_license_class: string | null;
  driver_license_professional: boolean | null;
  driver_license_points: number | null;
  email_verified: boolean | null;
  phone_verified: boolean | null;
  id_verified: boolean | null;
  location_verified_at: string | null;
  driver_license_verified_at: string | null;
  driver_class: number | null;
  driver_score: number | null;
  fee_multiplier: number | null;
  guarantee_multiplier: number | null;
  class_description: string | null;
  documents: RenterDocument[];
};

type RenterDocumentStatus = {
  label: string;
  tone: 'success' | 'warning' | 'danger';
};
