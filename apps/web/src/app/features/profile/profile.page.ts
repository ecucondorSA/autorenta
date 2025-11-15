import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { WalletService } from '../../core/services/wallet.service';
import { GoogleCalendarService } from '../../core/services/google-calendar.service';
import { ProfileStore } from '../../core/stores/profile.store';
import { Role } from '../../core/models';
import type { UpdateProfileData } from '../../core/services/profile.service';
import { DOCUMENT_TYPES } from '../../core/config/document-types.config';
import { CalendarManagementComponent } from '../../shared/components/calendar-management/calendar-management.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const SECTION_ANCHORS = {
  'basic-info': 'basic-info-card',
  contact: 'contact-block',
  address: 'address-block',
  license: 'license-block',
} as const;

type ProfileSection = keyof typeof SECTION_ANCHORS;

const SECTION_LABELS: Record<ProfileSection, string> = {
  'basic-info': 'Información básica',
  contact: 'Contacto',
  address: 'Dirección',
  license: 'Licencia de conducir',
};

const DOC_DEEP_LINKS: Record<
  string,
  {
    section: ProfileSection;
    reason: string;
  }
> = {
  gov_id_front: { section: 'basic-info', reason: 'tu DNI' },
  gov_id_back: { section: 'basic-info', reason: 'tu DNI' },
  passport: { section: 'basic-info', reason: 'tu pasaporte' },
  selfie: { section: 'basic-info', reason: 'tu selfie y datos personales' },
  driver_license: { section: 'license', reason: 'tu licencia' },
  utility_bill: { section: 'address', reason: 'tu domicilio' },
  vehicle_registration: { section: 'address', reason: 'el domicilio del titular del auto' },
  vehicle_insurance: { section: 'address', reason: 'la póliza del vehículo' },
  technical_inspection: { section: 'license', reason: 'la verificación técnica' },
  circulation_permit: { section: 'address', reason: 'tu permiso de circulación' },
  ownership_proof: { section: 'address', reason: 'los datos del titular' },
};

@Component({
  standalone: true,
  selector: 'app-profile-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    CalendarManagementComponent,
  ],
  templateUrl: './profile.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly walletService = inject(WalletService);
  private readonly googleCalendarService = inject(GoogleCalendarService);
  private readonly profileStore = inject(ProfileStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private highlightTimeout: ReturnType<typeof setTimeout> | null = null;

  // Use ProfileStore for profile state
  readonly profile = this.profileStore.profile;
  readonly loading = this.profileStore.loading;
  readonly uploadingAvatar = this.profileStore.uploadingAvatar;
  readonly error = this.profileStore.error;

  // Component-specific state
  readonly saving = signal(false);
  readonly message = signal<string | null>(null);
  readonly editMode = signal(false);
  readonly useWizard = signal(true); // Toggle between wizard and old form
  readonly copiedWAN = signal(false);
  readonly calendarConnected = signal(false);
  readonly calendarLoading = signal(false);
  readonly highlightedSection = signal<ProfileSection | null>(null);
  readonly calendarSuccessMessage = signal(false);

  // Use ProfileStore computed values
  readonly userEmail = this.profileStore.userEmail;
  readonly avatarUrl = this.profileStore.avatarUrl;
  readonly canPublishCars = this.profileStore.canPublishCars;
  readonly canBookCars = this.profileStore.canBookCars;

  // Wallet state (delegated from ProfileStore)
  readonly availableBalance = this.profileStore.availableBalance;
  readonly withdrawableBalance = this.profileStore.withdrawableBalance;
  readonly protectedCreditBalance = this.profileStore.protectedCreditBalance;
  readonly lockedBalance = this.profileStore.lockedBalance;
  readonly totalBalance = this.profileStore.totalBalance;

  readonly form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(3)]],
    role: ['renter' as Role, Validators.required],
    // Contact
    phone: [''],
    whatsapp: [''],
    // Driver License
    driver_license_number: [''],
    driver_license_country: [''],
    driver_license_expiry: [''],
    // Address
    address_line1: [''],
    address_line2: [''],
    city: [''],
    state: [''],
    postal_code: [''],
    country: [''],
  });

  readonly roles: { value: Role; label: string; description: string }[] = [
    {
      value: 'renter',
      label: 'Locatario',
      description: 'Solo quiero reservar autos',
    },
    {
      value: 'owner',
      label: 'Locador',
      description: 'Solo quiero publicar mis autos',
    },
    {
      value: 'both',
      label: 'Ambos',
      description: 'Quiero reservar y publicar autos',
    },
  ];

  ngOnInit(): void {
    // Handle document prefill from query params
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const docId = params.get('doc');
        if (docId) {
          this.handleDocPrefill(docId);
          void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { doc: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }
      });

    void this.loadProfile();
    void this.checkCalendarConnection();
    this.checkCalendarConnectionSuccess();
  }

  /**
   * Check if user was redirected from Google Calendar OAuth callback
   */
  private checkCalendarConnectionSuccess(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['calendar_connected'] === 'true') {
        this.calendarSuccessMessage.set(true);
        this.message.set('✅ Google Calendar conectado exitosamente');
        
        // Refresh calendar connection status
        void this.checkCalendarConnection();
        
        // Clear the query parameter from URL
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          queryParamsHandling: 'merge',
        });
        
        // Clear message after 5 seconds
        setTimeout(() => {
          this.calendarSuccessMessage.set(false);
          if (this.message() === '✅ Google Calendar conectado exitosamente') {
            this.message.set(null);
          }
        }, 5000);
      }
    });
  }

  async loadProfile(): Promise<void> {
    try {
      const profile = await this.profileStore.loadProfile();

      if (profile) {
        this.form.patchValue({
          full_name: profile.full_name,
          role: profile.role,
          phone: profile.phone ?? '',
          whatsapp: profile.whatsapp ?? '',
          driver_license_number: profile.driver_license_number ?? '',
          driver_license_country: profile.driver_license_country ?? '',
          driver_license_expiry: profile.driver_license_expiry ?? '',
          address_line1: profile.address_line1 ?? '',
          address_line2: profile.address_line2 ?? '',
          city: profile.city ?? '',
          state: profile.state ?? '',
          postal_code: profile.postal_code ?? '',
          country: profile.country ?? '',
        });
      }
    } catch {
      // Error is already handled by ProfileStore
      // Silent fail - error is shown via ProfileStore.error signal
    }
  }

  toggleEditMode(): void {
    if (this.editMode()) {
      // Cancelar edición - restaurar valores originales
      const profile = this.profile();
      if (profile) {
        this.form.patchValue({
          full_name: profile.full_name,
          role: profile.role,
          phone: profile.phone ?? '',
          whatsapp: profile.whatsapp ?? '',
          driver_license_number: profile.driver_license_number ?? '',
          driver_license_country: profile.driver_license_country ?? '',
          driver_license_expiry: profile.driver_license_expiry ?? '',
          address_line1: profile.address_line1 ?? '',
          address_line2: profile.address_line2 ?? '',
          city: profile.city ?? '',
          state: profile.state ?? '',
          postal_code: profile.postal_code ?? '',
          country: profile.country ?? '',
        });
      }
      this.editMode.set(false);
      this.message.set(null);
      this.error.set(null);
    } else {
      this.editMode.set(true);
    }
  }

  onWizardCancel(): void {
    this.editMode.set(false);
  }

  onWizardComplete(): void {
    this.editMode.set(false);
    this.message.set('Perfil actualizado exitosamente');
    setTimeout(() => this.message.set(null), 3000);
  }

  /**
   * Convert UserProfile to UpdateProfileData for wizard
   */
  getProfileDataForWizard(): UpdateProfileData | null {
    const profile = this.profile();
    if (!profile) return null;

    return {
      full_name: profile.full_name,
      role: profile.role,
      phone: profile.phone ?? undefined,
      whatsapp: profile.whatsapp ?? undefined,
      driver_license_number: profile.driver_license_number ?? undefined,
      driver_license_country: profile.driver_license_country ?? undefined,
      driver_license_expiry: profile.driver_license_expiry ?? undefined,
      address_line1: profile.address_line1 ?? undefined,
      address_line2: profile.address_line2 ?? undefined,
      city: profile.city ?? undefined,
      state: profile.state ?? undefined,
      postal_code: profile.postal_code ?? undefined,
      country: profile.country ?? undefined,
    };
  }

  async saveProfile(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.message.set(null);

    try {
      const updates = this.form.getRawValue();
      await this.profileStore.updateProfile(updates);
      this.editMode.set(false);
      this.message.set('Perfil actualizado exitosamente');

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => this.message.set(null), 3000);
    } catch {
      // Error is already handled by ProfileStore
      this.message.set(err instanceof Error ? err.message : 'No pudimos actualizar tu perfil.');
    } finally {
      this.saving.set(false);
    }
  }

  async onAvatarChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.message.set(null);

    try {
      await this.profileStore.uploadAvatar(file);
      this.message.set('Avatar actualizado exitosamente');
      setTimeout(() => this.message.set(null), 3000);
    } catch {
      // Error is already handled by ProfileStore
      this.message.set(err instanceof Error ? err.message : 'No pudimos actualizar tu avatar.');
    } finally {
      // Reset input
      input.value = '';
    }
  }

  async deleteAvatar(): Promise<void> {
    if (!confirm('¿Estás seguro de eliminar tu avatar?')) {
      return;
    }

    this.message.set(null);

    try {
      await this.profileStore.deleteAvatar();
      this.message.set('Avatar eliminado');
      setTimeout(() => this.message.set(null), 3000);
    } catch {
      // Error is already handled by ProfileStore
      this.message.set(err instanceof Error ? err.message : 'No pudimos eliminar tu avatar.');
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch {
      this.error.set('Error al cerrar sesión');
    }
  }

  /**
   * Copia el Wallet Account Number al portapapeles
   */
  async copyWalletAccountNumber(): Promise<void> {
    const wan = this.profile()?.wallet_account_number;
    if (!wan) return;

    try {
      await navigator.clipboard.writeText(wan);
      this.copiedWAN.set(true);

      // Reset copied state after 2 seconds
      setTimeout(() => {
        this.copiedWAN.set(false);
      }, 2000);
    } catch {
      this.error.set('Error al copiar el número de cuenta');
    }
  }

  private handleDocPrefill(docId: string): void {
    const docLabel = DOCUMENT_TYPES[docId]?.label ?? 'tu documentación';
    const config = DOC_DEEP_LINKS[docId];
    const message = config
      ? `Revisá ${docLabel}: ya completamos ${config.reason} en ${SECTION_LABELS[config.section]}.`
      : `Revisá ${docLabel} y confirmá que los datos estén correctos.`;

    if (!this.editMode()) {
      this.editMode.set(true);
    }

    this.focusSection(config?.section ?? 'basic-info');
    this.message.set(message);

    setTimeout(() => {
      if (this.message() === message) {
        this.message.set(null);
      }
    }, 5000);
  }

  private focusSection(section: ProfileSection): void {
    this.highlightedSection.set(section);

    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }

    this.highlightTimeout = setTimeout(() => {
      this.highlightedSection.set(null);
      this.highlightTimeout = null;
    }, 5000);

    if (typeof document === 'undefined') {
      return;
    }

    const anchorId = SECTION_ANCHORS[section];
    requestAnimationFrame(() => {
      document.getElementById(anchorId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  /**
   * Check Google Calendar connection status
   */
  async checkCalendarConnection(): Promise<void> {
    // Only check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.calendarConnected.set(false);
      return;
    }

    try {
      this.calendarLoading.set(true);
      const status = await this.googleCalendarService.getConnectionStatus().toPromise();
      this.calendarConnected.set(status?.connected ?? false);
    } catch {
      console.error('Error checking calendar connection:', err);
      this.calendarConnected.set(false);
      // Don't show error if it's just "not connected" - that's expected
      if (err instanceof Error && !err.message.includes('No active session')) {
        // Only log, don't show to user for status checks
      }
    } finally {
      this.calendarLoading.set(false);
    }
  }

  /**
   * Connect Google Calendar
   */
  async connectGoogleCalendar(): Promise<void> {
    // Verify user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.error.set('Debes iniciar sesión para conectar Google Calendar.');
      return;
    }

    try {
      this.calendarLoading.set(true);
      this.message.set(null);
      this.error.set(null);

      await this.googleCalendarService.connectGoogleCalendar().toPromise();

      // Check connection status after popup closes
      await this.checkCalendarConnection();

      if (this.calendarConnected()) {
        this.message.set('Google Calendar conectado exitosamente');
        setTimeout(() => this.message.set(null), 3000);
      }
    } catch {
      console.error('Error connecting calendar:', err);
      const errorMessage =
        err instanceof Error
          ? err.message.includes('No active session')
            ? 'Debes iniciar sesión para conectar Google Calendar.'
            : err.message
          : 'No pudimos conectar tu Google Calendar. Por favor, intenta nuevamente.';
      this.error.set(errorMessage);
    } finally {
      this.calendarLoading.set(false);
    }
  }

  /**
   * Disconnect Google Calendar
   */
  async disconnectGoogleCalendar(): Promise<void> {
    if (!confirm('¿Estás seguro de desconectar tu Google Calendar?')) {
      return;
    }

    try {
      this.calendarLoading.set(true);
      this.message.set(null);

      await this.googleCalendarService.disconnectCalendar().toPromise();
      this.calendarConnected.set(false);

      this.message.set('Google Calendar desconectado');
      setTimeout(() => this.message.set(null), 3000);
    } catch {
      console.error('Error disconnecting calendar:', err);
      this.error.set(
        err instanceof Error ? err.message : 'No pudimos desconectar tu Google Calendar.',
      );
    } finally {
      this.calendarLoading.set(false);
    }
  }
}
