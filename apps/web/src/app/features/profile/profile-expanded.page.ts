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
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import {
  UserProfile,
  Role,
  UserDocument,
  DocumentKind,
  NotificationPrefs,
  KycStatus,
  UserVerificationStatus,
  VerificationStatus,
} from '../../core/models';
import { VerificationService } from '../../core/services/verification.service';

type TabId =
  | 'general'
  | 'contact'
  | 'address'
  | 'verification'
  | 'notifications'
  | 'preferences'
  | 'security';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

interface VerificationChecklistItem {
  id: string;
  label: string;
  description?: string;
  statusType: 'document' | 'verification';
  status: KycStatus | VerificationStatus;
  completed: boolean;
  missingKey?: string;
  notes?: string | null;
}

@Component({
  standalone: true,
  selector: 'app-profile-expanded-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile-expanded.page.html',
  styleUrls: ['./profile-expanded.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileExpandedPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly verificationService = inject(VerificationService);

  // State signals
  readonly profile = signal<UserProfile | null>(null);
  readonly documents = signal<UserDocument[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly uploadingAvatar = signal(false);
  readonly uploadingDocument = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly activeTab = signal<TabId>('general');

  readonly verificationStatuses = this.verificationService.statuses;
  readonly verificationLoading = this.verificationService.loading;
  readonly verificationError = this.verificationService.error;

  readonly driverVerification = computed(() =>
    this.verificationStatuses().find((status) => status.role === 'driver') ?? null,
  );

  readonly ownerVerification = computed(() =>
    this.verificationStatuses().find((status) => status.role === 'owner') ?? null,
  );

  readonly overallVerificationStatus = computed<VerificationStatus>(() => {
    const statuses = this.verificationStatuses();
    if (!statuses.length) {
      return 'PENDIENTE';
    }
    if (statuses.some((status) => status.status === 'RECHAZADO')) {
      return 'RECHAZADO';
    }
    if (statuses.every((status) => status.status === 'VERIFICADO')) {
      return 'VERIFICADO';
    }
    return 'PENDIENTE';
  });

  readonly driverChecklist = computed(() => this.createDriverChecklist());
  readonly ownerChecklist = computed(() => this.createOwnerChecklist());

  readonly profileRole = computed(() => this.profile()?.role ?? 'renter');
  readonly showDriverFlow = computed(() => ['renter', 'both'].includes(this.profileRole()));
  readonly showOwnerFlow = computed(() => ['owner', 'both'].includes(this.profileRole()));

  // Computed
  readonly userEmail = computed(() => this.authService.session$()?.user?.email ?? '');
  readonly avatarUrl = computed(() => this.profile()?.avatar_url ?? '');
  readonly canPublishCars = computed(() => this.profile()?.can_publish_cars ?? false);
  readonly canBookCars = computed(() => this.profile()?.can_book_cars ?? false);
  readonly kycStatus = computed(() => this.profile()?.kyc ?? 'not_started');
  readonly onboardingComplete = computed(() => this.profile()?.onboarding === 'complete');
  readonly tosAccepted = computed(() => !!this.profile()?.tos_accepted_at);

  // Tabs
  readonly tabs: Tab[] = [
    { id: 'general', label: 'General', icon: 'user' },
    { id: 'contact', label: 'Contacto', icon: 'phone' },
    { id: 'address', label: 'Dirección', icon: 'map-pin' },
    { id: 'verification', label: 'Verificación', icon: 'shield-check' },
    { id: 'notifications', label: 'Notificaciones', icon: 'bell' },
    { id: 'preferences', label: 'Preferencias', icon: 'settings' },
    { id: 'security', label: 'Seguridad', icon: 'lock' },
  ];

  // Forms
  readonly generalForm = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(3)]],
    role: ['renter' as Role, Validators.required],
  });

  readonly contactForm = this.fb.nonNullable.group({
    phone: [''],
    whatsapp: [''],
  });

  readonly addressForm = this.fb.nonNullable.group({
    address_line1: [''],
    address_line2: [''],
    city: [''],
    state: [''],
    postal_code: [''],
    country: [''],
  });

  readonly verificationForm = this.fb.nonNullable.group({
    gov_id_type: ['DNI'],
    gov_id_number: [''],
    driver_license_number: [''],
    driver_license_country: ['AR'],
    driver_license_expiry: [''],
  });

  readonly preferencesForm = this.fb.nonNullable.group({
    timezone: ['America/Buenos_Aires'],
    locale: ['es-AR'],
    currency: ['ARS'],
    marketing_opt_in: [false],
  });

  readonly notificationsForm = this.fb.nonNullable.group({
    email_bookings: [true],
    email_promotions: [false],
    push_bookings: [true],
    push_promotions: [false],
    whatsapp_bookings: [true],
    whatsapp_promotions: [false],
  });

  readonly securityForm = this.fb.nonNullable.group({
    tos_accepted: [false],
  });

  readonly roles: { value: Role; label: string; description: string }[] = [
    { value: 'renter', label: 'Locatario', description: 'Solo quiero reservar autos' },
    { value: 'owner', label: 'Locador', description: 'Solo quiero publicar mis autos' },
    { value: 'both', label: 'Ambos', description: 'Quiero reservar y publicar autos' },
  ];

  readonly documentKinds: { value: DocumentKind; label: string }[] = [
    { value: 'gov_id_front', label: 'DNI/CI - Frente' },
    { value: 'gov_id_back', label: 'DNI/CI - Dorso' },
    { value: 'driver_license', label: 'Licencia de conducir' },
    { value: 'vehicle_registration', label: 'Cédula verde / Documento del vehículo' },
    { value: 'vehicle_insurance', label: 'Seguro del vehículo (opcional)' },
    { value: 'utility_bill', label: 'Factura de servicios' },
    { value: 'selfie', label: 'Selfie de verificación' },
  ];

  ngOnInit(): void {
    void this.loadProfile();
    void this.loadDocuments();
    void this.refreshVerificationStatuses();
  }

  async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const profile = await this.profileService.getMe();
      this.profile.set(profile);
      this.populateForms(profile);
    } catch (err) {
      console.error('Error loading profile:', err);
      this.error.set(err instanceof Error ? err.message : 'No pudimos cargar tu perfil.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadDocuments(): Promise<void> {
    try {
      const docs = await this.profileService.getMyDocuments();
      this.documents.set(docs);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  }

  async refreshVerificationStatuses(role?: 'driver' | 'owner'): Promise<void> {
    try {
      await this.verificationService.triggerVerification(role);
    } catch (err) {
      console.warn('No pudimos actualizar el estado de verificación automáticamente:', err);
    }
  }

  private getDocumentStatusForKinds(kinds: DocumentKind | DocumentKind[]): {
    status: KycStatus;
    completed: boolean;
    notes?: string | null;
  } {
    const docKinds = Array.isArray(kinds) ? kinds : [kinds];
    const docs = this.documents().filter((doc) => docKinds.includes(doc.kind));

    if (docs.length === 0) {
      return { status: 'not_started', completed: false };
    }

    if (docs.some((doc) => doc.status === 'rejected')) {
      const rejectedDoc = docs.find((doc) => doc.status === 'rejected');
      return {
        status: 'rejected',
        completed: false,
        notes: rejectedDoc?.notes ?? null,
      };
    }

    if (docs.some((doc) => doc.status === 'pending')) {
      const pendingDoc = docs.find((doc) => doc.status === 'pending');
      return {
        status: 'pending',
        completed: false,
        notes: pendingDoc?.notes ?? null,
      };
    }

    if (docs.every((doc) => doc.status === 'verified')) {
      return {
        status: 'verified',
        completed: true,
        notes: docs[0]?.notes ?? null,
      };
    }

    // Fallback: return first doc status
    const doc = docs[0]!;
    return {
      status: doc.status,
      completed: doc.status === 'verified',
      notes: doc.notes ?? null,
    };
  }

  private createDriverChecklist(): VerificationChecklistItem[] {
    const verification = this.driverVerification();
    const missingDocs = verification?.missing_docs ?? [];

    const licenseStatus = this.getDocumentStatusForKinds('driver_license');
    const selfieStatus = this.getDocumentStatusForKinds('selfie');

    return [
      {
        id: 'driver_license_upload',
        label: 'Subí tu licencia de conducir',
        description: 'Foto clara donde se lean tu nombre y la fecha de vencimiento.',
        statusType: 'document',
        status: licenseStatus.status,
        completed: licenseStatus.completed,
        missingKey: 'licencia',
        notes: licenseStatus.notes ?? null,
      },
      {
        id: 'driver_selfie',
        label: 'Agregá una selfie sosteniendo tu licencia (recomendado)',
        description: 'Ayuda a acelerar la verificación automática.',
        statusType: 'document',
        status: selfieStatus.status,
        completed: selfieStatus.completed,
        notes: selfieStatus.notes ?? null,
      },
      {
        id: 'driver_ai_review',
        label: 'Validación automática de la licencia',
        description: 'La IA comprueba autenticidad, vigencia y coincidencia con tu perfil.',
        statusType: 'verification',
        status: verification?.status ?? 'PENDIENTE',
        completed: verification?.status === 'VERIFICADO',
        missingKey: missingDocs.includes('licencia') ? 'licencia' : undefined,
        notes: verification?.notes ?? null,
      },
    ];
  }

  private createOwnerChecklist(): VerificationChecklistItem[] {
    const verification = this.ownerVerification();
    const missingDocs = verification?.missing_docs ?? [];

    const vehicleStatus = this.getDocumentStatusForKinds('vehicle_registration');
    const insuranceStatus = this.getDocumentStatusForKinds('vehicle_insurance');
    const govIdStatus = this.getDocumentStatusForKinds(['gov_id_front', 'gov_id_back']);

    return [
      {
        id: 'owner_gov_id',
        label: 'Subí tu documento personal (DNI / Pasaporte)',
        description: 'Frente y dorso legibles, sin reflejos ni recortes.',
        statusType: 'document',
        status: govIdStatus.status,
        completed: govIdStatus.completed,
        missingKey: 'dni',
        notes: govIdStatus.notes ?? null,
      },
      {
        id: 'owner_vehicle_doc',
        label: 'Subí la documentación del vehículo (cédula verde)',
        description: 'Debe coincidir con la patente y datos que vas a publicar.',
        statusType: 'document',
        status: vehicleStatus.status,
        completed: vehicleStatus.completed,
        missingKey: 'cedula_auto',
        notes: vehicleStatus.notes ?? null,
      },
      {
        id: 'owner_insurance',
        label: 'Seguro del vehículo (opcional pero recomendado)',
        description: 'Adjuntalo para generar más confianza en los conductores.',
        statusType: 'document',
        status: insuranceStatus.status,
        completed: insuranceStatus.completed,
        notes: insuranceStatus.notes ?? null,
      },
      {
        id: 'owner_ai_review',
        label: 'Validación automática de la documentación',
        description: 'La IA verifica que seas el titular y que los datos del auto sean coherentes.',
        statusType: 'verification',
        status: verification?.status ?? 'PENDIENTE',
        completed: verification?.status === 'VERIFICADO',
        missingKey: missingDocs.find((doc) =>
          ['dni', 'cedula_auto'].includes(doc),
        ),
        notes: verification?.notes ?? null,
      },
    ];
  }

  populateForms(profile: UserProfile): void {
    this.generalForm.patchValue({
      full_name: profile.full_name,
      role: profile.role,
    });

    this.contactForm.patchValue({
      phone: profile.phone ?? '',
      whatsapp: profile.whatsapp ?? '',
    });

    this.addressForm.patchValue({
      address_line1: profile.address_line1 ?? '',
      address_line2: profile.address_line2 ?? '',
      city: profile.city ?? '',
      state: profile.state ?? '',
      postal_code: profile.postal_code ?? '',
      country: profile.country ?? '',
    });

    this.verificationForm.patchValue({
      gov_id_type: profile.gov_id_type ?? 'DNI',
      gov_id_number: profile.gov_id_number ?? '',
      driver_license_number: profile.driver_license_number ?? '',
      driver_license_country: profile.driver_license_country ?? 'AR',
      driver_license_expiry: profile.driver_license_expiry ?? '',
    });

    this.preferencesForm.patchValue({
      timezone: profile.timezone,
      locale: profile.locale,
      currency: profile.currency,
      marketing_opt_in: profile.marketing_opt_in,
    });

    const notifPrefs = profile.notif_prefs;
    this.notificationsForm.patchValue({
      email_bookings: notifPrefs.email.bookings,
      email_promotions: notifPrefs.email.promotions,
      push_bookings: notifPrefs.push.bookings,
      push_promotions: notifPrefs.push.promotions,
      whatsapp_bookings: notifPrefs.whatsapp.bookings,
      whatsapp_promotions: notifPrefs.whatsapp.promotions,
    });

    this.securityForm.patchValue({
      tos_accepted: !!profile.tos_accepted_at,
    });
  }

  setActiveTab(tabId: TabId): void {
    this.activeTab.set(tabId);
    this.message.set(null);
    this.error.set(null);
  }

  async saveCurrentTab(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);

    try {
      const activeTab = this.activeTab();
      let payload: any = {};

      switch (activeTab) {
        case 'general':
          if (this.generalForm.invalid) {
            this.generalForm.markAllAsTouched();
            return;
          }
          payload = this.generalForm.getRawValue();
          break;

        case 'contact':
          payload = this.contactForm.getRawValue();
          break;

        case 'address':
          payload = this.addressForm.getRawValue();
          break;

        case 'verification':
          payload = this.verificationForm.getRawValue();
          break;

        case 'preferences':
          payload = this.preferencesForm.getRawValue();
          break;

        case 'notifications': {
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
            } as NotificationPrefs,
          };
          break;
        }

        case 'security': {
          const tosValue = this.securityForm.value.tos_accepted;
          if (tosValue && !this.tosAccepted()) {
            payload = { tos_accepted_at: true };
          }
          break;
        }
      }

      const updatedProfile = await this.profileService.updateProfileSafe(payload);
      this.profile.set(updatedProfile);
      this.message.set('Cambios guardados exitosamente');

      setTimeout(() => this.message.set(null), 3000);
    } catch (err) {
      console.error(err);
      this.error.set(err instanceof Error ? err.message : 'No pudimos guardar los cambios.');
    } finally {
      this.saving.set(false);
    }
  }

  async onAvatarChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.uploadingAvatar.set(true);
    this.error.set(null);

    try {
      const newAvatarUrl = await this.profileService.uploadAvatar(file);
      await this.profileService.setAvatar(newAvatarUrl);

      const currentProfile = this.profile();
      if (currentProfile) {
        this.profile.set({
          ...currentProfile,
          avatar_url: newAvatarUrl,
        });
      }

      this.message.set('Avatar actualizado exitosamente');
      setTimeout(() => this.message.set(null), 3000);
    } catch (err) {
      console.error(err);
      this.error.set(err instanceof Error ? err.message : 'No pudimos actualizar tu avatar.');
    } finally {
      this.uploadingAvatar.set(false);
      input.value = '';
    }
  }

  async onDocumentUpload(event: Event, kind: DocumentKind): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.uploadingDocument.set(true);
    this.error.set(null);

    try {
      await this.profileService.uploadDocument(file, kind);
      await this.loadDocuments();
      await this.refreshVerificationStatuses();

      this.message.set('Documento subido exitosamente');
      setTimeout(() => this.message.set(null), 3000);
    } catch (err) {
      console.error(err);
      this.error.set(err instanceof Error ? err.message : 'No pudimos subir el documento.');
    } finally {
      this.uploadingDocument.set(false);
      input.value = '';
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    if (!confirm('¿Estás seguro de eliminar este documento?')) {
      return;
    }

    try {
      await this.profileService.deleteDocument(documentId);
      await this.loadDocuments();
      await this.refreshVerificationStatuses();

      this.message.set('Documento eliminado');
      setTimeout(() => this.message.set(null), 3000);
    } catch (err) {
      console.error(err);
      this.error.set('No pudimos eliminar el documento.');
    }
  }

  getDocumentLabel(kind: DocumentKind): string {
    return this.documentKinds.find((dk) => dk.value === kind)?.label ?? kind;
  }

  getKycStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      not_started: 'No iniciado',
      pending: 'Pendiente de revisión',
      verified: 'Verificado',
      rejected: 'Rechazado',
    };
    return labels[status] ?? status;
  }

  getKycStatusClass(status: string): string {
    const classes: Record<string, string> = {
      not_started: 'bg-ash-gray text-white-pure',
      pending: 'bg-accent-warm text-white-pure',
      verified: 'bg-green-600 text-white-pure',
      rejected: 'bg-red-600 text-white-pure',
    };
    return classes[status] ?? 'bg-pearl-gray text-smoke-black';
  }

  getVerificationStatusLabel(status: VerificationStatus | string): string {
    const normalized = (status as VerificationStatus) ?? 'PENDIENTE';
    const labels: Record<VerificationStatus, string> = {
      VERIFICADO: 'Verificado',
      PENDIENTE: 'Pendiente',
      RECHAZADO: 'Rechazado',
    };
    return labels[normalized] ?? labels.PENDIENTE;
  }

  getVerificationStatusClass(status: VerificationStatus | string): string {
    const normalized = (status as VerificationStatus) ?? 'PENDIENTE';
    const classes: Record<VerificationStatus, string> = {
      VERIFICADO: 'bg-green-100 text-green-800 border border-green-200',
      PENDIENTE: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      RECHAZADO: 'bg-red-100 text-red-800 border border-red-200',
    };
    return classes[normalized] ?? classes.PENDIENTE;
  }

  getVerificationStatusIcon(status: VerificationStatus | string): string {
    const normalized = (status as VerificationStatus) ?? 'PENDIENTE';
    const icons: Record<VerificationStatus, string> = {
      VERIFICADO: '🟢',
      PENDIENTE: '🔶',
      RECHAZADO: '🔴',
    };
    return icons[normalized] ?? icons.PENDIENTE;
  }

  getMissingDocumentLabel(code: string): string {
    const labels: Record<string, string> = {
      licencia: 'Licencia de conducir',
      cedula_auto: 'Documento del vehículo',
      dni: 'Documento personal',
    };
    return labels[code] ?? code;
  }

  isVerificationStep(step: VerificationChecklistItem): boolean {
    return step.statusType === 'verification';
  }

  getStepStatusLabel(step: VerificationChecklistItem): string {
    if (step.statusType === 'verification') {
      return this.getVerificationStatusLabel(step.status as VerificationStatus);
    }
    return this.getKycStatusLabel(step.status as string);
  }

  getStepStatusClass(step: VerificationChecklistItem): string {
    if (step.statusType === 'verification') {
      return this.getVerificationStatusClass(step.status as VerificationStatus);
    }
    return this.getKycStatusClass(step.status as string);
  }

  getStepIcon(step: VerificationChecklistItem): string {
    if (step.statusType === 'verification') {
      return this.getVerificationStatusIcon(step.status as VerificationStatus);
    }
    return step.completed ? '✅' : '📄';
  }

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch (err) {
      console.error(err);
      this.error.set('Error al cerrar sesión');
    }
  }
}
