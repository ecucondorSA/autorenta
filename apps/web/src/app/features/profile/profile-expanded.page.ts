import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import {
  UserProfile,
  Role,
  UserDocument,
  DocumentKind,
  NotificationPrefs,
  KycStatus,
  VerificationStatus,
} from '../../core/models';
import { MetaService } from '../../core/services/meta.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs/operators';
import { from } from 'rxjs';
import { VerificationStateService } from '../../core/services/verification-state.service';
import { VerificationNotificationsService } from '../../core/services/verification-notifications.service';
import { VerificationProgressComponent } from '../../shared/components/verification-progress/verification-progress.component';
import { EmailVerificationComponent } from '../../shared/components/email-verification/email-verification.component';
import { PhoneVerificationComponent } from '../../shared/components/phone-verification/phone-verification.component';
import { SelfieCaptureComponent } from '../../shared/components/selfie-capture/selfie-capture.component';
import { NotificationToastComponent } from '../../shared/components/notification-toast/notification-toast.component';

type TabId =
  | 'general'
  | 'contact'
  | 'address'
  | 'verification'
  | 'notifications'
  | 'preferences'
  | 'security';

@Component({
  standalone: true,
  selector: 'app-profile-expanded-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    VerificationProgressComponent,
    EmailVerificationComponent,
    PhoneVerificationComponent,
    SelfieCaptureComponent,
    NotificationToastComponent,
  ],
  templateUrl: './profile-expanded.page.html',
  styleUrls: ['./profile-expanded.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileExpandedPage {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly metaService = inject(MetaService);
  private readonly verificationStateService = inject(VerificationStateService);
  private readonly verificationNotificationsService = inject(VerificationNotificationsService);

  // Core signals
  readonly profile = toSignal(
    from(this.profileService.getMe()).pipe(
      tap((profile) => {
        if (profile) this.populateForms(profile);
      })
    ),
    { initialValue: null }
  );
  
  private readonly documentsSubject = signal<UserDocument[]>([]);
  readonly documents = this.documentsSubject.asReadonly();
  
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly activeTab = signal<TabId>('general');

  // Profile computed values
  readonly avatarUrl = computed(() => this.profile()?.avatar_url ?? null);
  readonly uploadingAvatar = signal(false);
  readonly userEmail = computed(() => this.authService.session$()?.user?.email ?? '');
  
  readonly canPublishCars = computed(() => {
    const role = this.profile()?.role;
    return role === 'owner' || role === 'both';
  });
  
  readonly canBookCars = computed(() => {
    const role = this.profile()?.role;
    return role === 'renter' || role === 'both';
  });

  // Verification status
  readonly driverLicenseStatus = computed((): KycStatus => {
    const docs = this.documents();
    const driverDoc = docs.find(d => d.kind === 'driver_license');
    return (driverDoc?.status as KycStatus) ?? 'not_started';
  });
  
  readonly vehicleRegistrationStatus = computed((): KycStatus => {
    const docs = this.documents();
    const vehicleDoc = docs.find(d => d.kind === 'vehicle_registration');
    return (vehicleDoc?.status as KycStatus) ?? 'not_started';
  });
  
  readonly kycStatus = computed((): KycStatus => {
    const dl = this.driverLicenseStatus();
    const vr = this.vehicleRegistrationStatus();
    
    if (dl === 'rejected' || vr === 'rejected') return 'rejected';
    if (dl === 'pending' || vr === 'pending') return 'pending';
    if (dl === 'verified' && vr === 'verified') return 'verified';
    return 'not_started';
  });

  readonly overallVerificationStatus = computed((): VerificationStatus => {
    const profile = this.profile();
    if (!profile) return 'PENDIENTE';
    
    const emailVerified = profile.is_email_verified ?? false;
    const phoneVerified = profile.is_phone_verified ?? false;
    const kycVerified = this.kycStatus() === 'verified';
    
    if (emailVerified && phoneVerified && kycVerified) {
      return 'VERIFICADO';
    }
    if (this.kycStatus() === 'rejected') {
      return 'RECHAZADO';
    }
    return 'PENDIENTE';
  });

  readonly verificationError = signal<string | null>(null);
  readonly verificationLoading = signal(false);
  readonly uploadingDocument = signal<string | null>(null); // Track which document is being uploaded

  readonly showDriverFlow = computed(() => {
    const role = this.profile()?.role;
    return role === 'renter' || role === 'both';
  });
  
  readonly showOwnerFlow = computed(() => {
    const role = this.profile()?.role;
    return role === 'owner' || role === 'both';
  });

  readonly driverVerification = computed(() => {
    const kycStatus = this.driverLicenseStatus();
    let verificationStatus: VerificationStatus = 'PENDIENTE';
    
    if (kycStatus === 'verified') verificationStatus = 'VERIFICADO';
    else if (kycStatus === 'rejected') verificationStatus = 'RECHAZADO';
    
    return {
      status: verificationStatus,
      progress: kycStatus === 'verified' ? 100 : 50,
    };
  });
  
  readonly ownerVerification = computed(() => {
    const kycStatus = this.vehicleRegistrationStatus();
    let verificationStatus: VerificationStatus = 'PENDIENTE';
    
    if (kycStatus === 'verified') verificationStatus = 'VERIFICADO';
    else if (kycStatus === 'rejected') verificationStatus = 'RECHAZADO';
    
    return {
      status: verificationStatus,
      progress: kycStatus === 'verified' ? 100 : 50,
    };
  });

  readonly driverChecklist = computed(() => [
    {
      id: 'email',
      label: 'Email verificado',
      completed: this.profile()?.is_email_verified ?? false,
      description: null,
      missingKey: null,
      notes: null,
    },
    {
      id: 'phone',
      label: 'Teléfono verificado',
      completed: this.profile()?.is_phone_verified ?? false,
      description: null,
      missingKey: null,
      notes: null,
    },
    {
      id: 'driver_license',
      label: 'Licencia de conducir',
      completed: this.driverLicenseStatus() === 'verified',
      description: null,
      missingKey: null,
      notes: null,
    },
  ]);
  
  readonly ownerChecklist = computed(() => [
    {
      id: 'email',
      label: 'Email verificado',
      completed: this.profile()?.is_email_verified ?? false,
      description: null,
      missingKey: null,
      notes: null,
    },
    {
      id: 'vehicle',
      label: 'Registro de vehículo',
      completed: this.vehicleRegistrationStatus() === 'verified',
      description: null,
      missingKey: null,
      notes: null,
    },
  ]);

  readonly tosAccepted = computed(() => !!this.profile()?.tos_accepted_at);

  // Forms
  readonly contactForm = this.fb.group({
    phone: [''],
    whatsapp: [''],
  });

  readonly addressForm = this.fb.group({
    address_line1: [''],
    address_line2: [''],
    city: [''],
    state: [''],
    postal_code: [''],
    country: [''],
  });

  readonly notificationsForm = this.fb.group({
    email_bookings: [true],
    email_promotions: [true],
    push_bookings: [true],
    push_promotions: [true],
    whatsapp_bookings: [false],
    whatsapp_promotions: [false],
  });

  readonly preferencesForm = this.fb.group({
    timezone: ['America/Buenos_Aires'],
    locale: ['es-AR'],
    currency: ['ARS'],
    marketing_opt_in: [true],
  });

  readonly securityForm = this.fb.group({
    tos_accepted: [{ value: false, disabled: true }],
  });

  readonly tabs = [
    { id: 'general' as TabId, label: 'General' },
    { id: 'contact' as TabId, label: 'Contacto' },
    { id: 'address' as TabId, label: 'Dirección' },
    { id: 'verification' as TabId, label: 'Verificación' },
    { id: 'notifications' as TabId, label: 'Notificaciones' },
    { id: 'preferences' as TabId, label: 'Preferencias' },
    { id: 'security' as TabId, label: 'Seguridad' },
  ];

  readonly roles = [
    { value: 'renter' as Role, label: 'Locatario', description: 'Quiero alquilar autos' },
    { value: 'owner' as Role, label: 'Locador', description: 'Quiero publicar mis autos' },
    { value: 'both' as Role, label: 'Ambos', description: 'Quiero alquilar y publicar' },
  ];

  readonly generalForm = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(3)]],
    role: ['renter' as Role, Validators.required],
  });

  // Helper methods
  getKycStatusClass(status: KycStatus): string {
    const map: Record<KycStatus, string> = {
      'not_started': 'bg-gray-100 text-gray-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'verified': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
    };
    return map[status] || map['not_started'];
  }

  getKycStatusLabel(status: KycStatus): string {
    const map: Record<KycStatus, string> = {
      'not_started': 'No iniciado',
      'pending': 'Pendiente',
      'verified': 'Verificado',
      'rejected': 'Rechazado',
    };
    return map[status] || 'No iniciado';
  }

  getVerificationStatusClass(status: VerificationStatus): string {
    const map: Record<VerificationStatus, string> = {
      'VERIFICADO': 'bg-green-100 text-green-800',
      'PENDIENTE': 'bg-yellow-100 text-yellow-800',
      'RECHAZADO': 'bg-red-100 text-red-800',
    };
    return map[status];
  }

  getVerificationStatusIcon(status: VerificationStatus): string {
    const map: Record<VerificationStatus, string> = {
      'VERIFICADO': 'check-circle',
      'PENDIENTE': 'clock',
      'RECHAZADO': 'x-circle',
    };
    return map[status];
  }

  getVerificationStatusLabel(status: VerificationStatus): string {
    return status;
  }

  getStepIcon(step: { completed: boolean }): string {
    return step.completed ? 'check-circle' : 'circle';
  }

  getStepStatusClass(step: { completed: boolean }): string {
    return step.completed ? 'text-green-600' : 'text-gray-400';
  }

  getStepStatusLabel(step: { completed: boolean }): string {
    return step.completed ? 'Completado' : 'Pendiente';
  }

  getMissingDocumentLabel(key: string): string {
    const labels: Record<string, string> = {
      'email': 'Email',
      'phone': 'Teléfono',
      'driver_license': 'Licencia de conducir',
      'vehicle': 'Registro de vehículo',
    };
    return labels[key] || key;
  }

  async refreshVerificationStatuses(flow: 'driver' | 'owner'): Promise<void> {
    this.verificationLoading.set(true);
    try {
      await this.loadDocuments();
      this.message.set('Estado de verificación actualizado');
    } catch (err) {
      this.verificationError.set('Error al actualizar estado');
    } finally {
      this.verificationLoading.set(false);
    }
  }

  async onDocumentUpload(event: Event, kind: DocumentKind): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.uploadingDocument.set(kind);
    this.error.set(null);
    this.message.set(null);

    try {
      await this.profileService.uploadDocument(file, kind);
      // Refresh documents list
      await this.loadDocuments();
      this.message.set('Documento subido exitosamente. La verificación puede tardar unos minutos.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al subir el documento');
    } finally {
      this.uploadingDocument.set(null);
      // Reset file input
      (event.target as HTMLInputElement).value = '';
    }
  }

  isUploadingDocument(kind: string): boolean {
    return this.uploadingDocument() === kind;
  }

  constructor() {
    // Subscribe to route query params for tab navigation
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (this.isValidTab(tab)) {
        this.activeTab.set(tab as TabId);
      }
    });

    this.metaService.updateProfileMeta();

    // Load documents on init
    this.loadDocuments();

    // Initialize verification state and notifications
    this.initializeVerificationServices();
  }

  private async initializeVerificationServices(): Promise<void> {
    try {
      await this.verificationStateService.initialize();
      this.verificationNotificationsService.initialize();
      console.log('[ProfileExpanded] Verification services initialized');
    } catch (error) {
      console.error('[ProfileExpanded] Error initializing verification services:', error);
    }
  }

  private async loadDocuments(): Promise<void> {
    try {
      const docs = await this.profileService.getMyDocuments();
      this.documentsSubject.set(docs);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  }

  private isValidTab(tab: string | null): boolean {
    if (!tab) return false;
    return ['general', 'contact', 'address', 'verification', 'notifications', 'preferences', 'security'].includes(tab);
  }

  private populateForms(profile: UserProfile): void {
    // Populate general form
    this.generalForm.patchValue({
      full_name: profile.full_name || '',
      role: profile.role || 'renter',
    });

    // Populate contact form
    this.contactForm.patchValue({
      phone: profile.phone || '',
      whatsapp: profile.whatsapp || '',
    });

    // Populate address form
    this.addressForm.patchValue({
      address_line1: profile.address_line1 || '',
      address_line2: profile.address_line2 || '',
      city: profile.city || '',
      state: profile.state || '',
      postal_code: profile.postal_code || '',
      country: profile.country || '',
    });

    // Populate notifications form
    const prefs = profile.notif_prefs;
    if (prefs) {
      this.notificationsForm.patchValue({
        email_bookings: prefs.email?.bookings ?? true,
        email_promotions: prefs.email?.promotions ?? true,
        push_bookings: prefs.push?.bookings ?? true,
        push_promotions: prefs.push?.promotions ?? true,
        whatsapp_bookings: prefs.whatsapp?.bookings ?? false,
        whatsapp_promotions: prefs.whatsapp?.promotions ?? false,
      });
    }

    // Populate preferences form
    this.preferencesForm.patchValue({
      timezone: profile.timezone || 'America/Buenos_Aires',
      locale: profile.locale || 'es-AR',
      currency: profile.currency || 'ARS',
      marketing_opt_in: profile.marketing_opt_in ?? true,
    });

    // Populate security form
    this.securityForm.patchValue({
      tos_accepted: !!profile.tos_accepted_at,
    });
  }

  setActiveTab(tabId: TabId): void {
    this.activeTab.set(tabId);
  }

  async saveCurrentTab(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);
    
    try {
      const tab = this.activeTab();
      let payload: any = {};

      switch (tab) {
        case 'general':
          payload = this.generalForm.getRawValue();
          break;
        case 'contact':
          payload = this.contactForm.getRawValue();
          break;
        case 'address':
          payload = this.addressForm.getRawValue();
          break;
        case 'notifications':
          const notifValues = this.notificationsForm.getRawValue();
          payload = {
            notif_prefs: {
              email: {
                bookings: notifValues.email_bookings,
                promotions: notifValues.email_promotions,
              },
              push: {
                bookings: notifValues.push_bookings,
                promotions: notifValues.push_promotions,
              },
              whatsapp: {
                bookings: notifValues.whatsapp_bookings,
                promotions: notifValues.whatsapp_promotions,
              },
            },
          };
          break;
        case 'preferences':
          payload = this.preferencesForm.getRawValue();
          break;
      }

      await this.profileService.safeUpdateProfile(payload);
      await this.profileService.getMe();
      this.message.set('Cambios guardados exitosamente');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No pudimos guardar los cambios.');
    } finally {
      this.saving.set(false);
    }
  }

  async onAvatarChange(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.uploadingAvatar.set(true);
    this.loading.set(true);
    
    try {
      const newAvatarUrl = await this.profileService.uploadAvatar(file);
      await this.profileService.safeUpdateProfile({ avatar_url: newAvatarUrl });
      await this.profileService.getMe();
      this.message.set('Avatar actualizado exitosamente');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No pudimos actualizar tu avatar.');
    } finally {
      this.loading.set(false);
      this.uploadingAvatar.set(false);
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch (err) {
      this.error.set('Error al cerrar sesión');
    }
  }
}
