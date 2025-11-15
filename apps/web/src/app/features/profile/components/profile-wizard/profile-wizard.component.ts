import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { ProfileStore } from '../../../../core/stores/profile.store';
import { NotificationManagerService } from '../../../../core/services/notification-manager.service';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import type { Role, UpdateProfileData } from '../../../../core/models';

export type WizardStep = 'general' | 'contact' | 'address' | 'license';

/**
 * ProfileWizardComponent - Wizard de edición de perfil por pasos
 *
 * Features:
 * - Pasos: General → Contacto → Dirección → Licencia
 * - Validaciones progresivas por paso
 * - Persistencia optimista con rollback en error
 * - Autosave silencioso para campos menores (WhatsApp, ciudad)
 * - Toasts de éxito/error
 * - Tracking analítico de eventos
 */
@Component({
  selector: 'app-profile-wizard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-wizard.component.html',
  styleUrls: ['./profile-wizard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileWizardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileStore = inject(ProfileStore);
  private readonly toastService = inject(NotificationManagerService);
  private readonly analytics = inject(AnalyticsService);

  // Inputs
  readonly initialData = input<UpdateProfileData | null>(null);
  readonly cancelWizard = output<void>();
  readonly completeWizard = output<void>();

  // Step management
  readonly currentStep = signal<WizardStep>('general');
  readonly completedSteps = signal<Set<WizardStep>>(new Set());
  readonly dirtySteps = signal<Set<WizardStep>>(new Set());

  // Forms for each step
  readonly generalForm = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(3)]],
    role: ['renter' as Role, Validators.required],
  });

  readonly contactForm = this.fb.group({
    phone: ['', [Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
    whatsapp: ['', [Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
  });

  readonly addressForm = this.fb.group({
    address_line1: [''],
    address_line2: [''],
    city: [''],
    state: [''],
    postal_code: [''],
    country: [''],
  });

  readonly licenseForm = this.fb.group({
    driver_license_number: [''],
    driver_license_country: [''],
    driver_license_expiry: [''],
  });

  // Loading states
  readonly savingStep = signal<WizardStep | null>(null);
  readonly saving = computed(() => this.savingStep() !== null);

  // Steps configuration
  readonly steps: Array<{ id: WizardStep; label: string; description: string }> = [
    { id: 'general', label: 'General', description: 'Nombre y rol' },
    { id: 'contact', label: 'Contacto', description: 'Teléfono y WhatsApp' },
    { id: 'address', label: 'Dirección', description: 'Ubicación completa' },
    { id: 'license', label: 'Licencia', description: 'Licencia de conducir' },
  ];

  readonly roles: Array<{ value: Role; label: string; description: string }> = [
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

  // Computed values
  readonly currentStepIndex = computed(() => {
    return this.steps.findIndex((s) => s.id === this.currentStep());
  });

  readonly progressPercentage = computed(() => {
    return ((this.currentStepIndex() + 1) / this.steps.length) * 100;
  });

  readonly canGoNext = computed(() => {
    const step = this.currentStep();
    switch (step) {
      case 'general':
        return this.generalForm.valid;
      case 'contact':
        return this.contactForm.valid;
      case 'address':
        return this.addressForm.valid;
      case 'license':
        return this.licenseForm.valid;
      default:
        return false;
    }
  });

  readonly canGoPrevious = computed(() => {
    return this.currentStepIndex() > 0;
  });

  readonly isLastStep = computed(() => {
    return this.currentStepIndex() === this.steps.length - 1;
  });

  constructor() {
    // Setup autosave for minor fields (WhatsApp, city)
    this.setupAutosave();
  }

  ngOnInit(): void {
    // Populate forms with initial data
    const data = this.initialData();
    if (data) {
      this.populateForms(data);
    }
  }

  /**
   * Setup autosave for minor fields (WhatsApp, city)
   */
  private setupAutosave(): void {
    // Autosave WhatsApp (silent, no toast)
    this.contactForm
      .get('whatsapp')
      ?.valueChanges.pipe(
        debounceTime(2000), // 2 seconds
        distinctUntilChanged(),
        filter(() => this.contactForm.get('whatsapp')?.valid ?? false),
      )
      .subscribe(async (whatsapp) => {
        if (whatsapp) {
          await this.saveStepSilently('contact', { whatsapp });
        }
      });

    // Autosave city (silent, no toast)
    this.addressForm
      .get('city')
      ?.valueChanges.pipe(
        debounceTime(2000), // 2 seconds
        distinctUntilChanged(),
        filter(() => this.addressForm.get('city')?.valid ?? false),
      )
      .subscribe(async (city) => {
        if (city) {
          await this.saveStepSilently('address', { city });
        }
      });
  }

  /**
   * Populate all forms with initial data
   */
  private populateForms(data: UpdateProfileData): void {
    this.generalForm.patchValue({
      full_name: data.full_name ?? '',
      role: data.role ?? 'renter',
    });

    this.contactForm.patchValue({
      phone: data.phone ?? '',
      whatsapp: data.whatsapp ?? '',
    });

    this.addressForm.patchValue({
      address_line1: data.address_line1 ?? '',
      address_line2: data.address_line2 ?? '',
      city: data.city ?? '',
      state: data.state ?? '',
      postal_code: data.postal_code ?? '',
      country: data.country ?? '',
    });

    this.licenseForm.patchValue({
      driver_license_number: data.driver_license_number ?? '',
      driver_license_country: data.driver_license_country ?? '',
      driver_license_expiry: data.driver_license_expiry ?? '',
    });
  }

  /**
   * Get form data for current step
   */
  private getFormDataForStep(step: WizardStep): Partial<UpdateProfileData> {
    switch (step) {
      case 'general':
        return this.generalForm.getRawValue();
      case 'contact': {
        const values = this.contactForm.getRawValue();
        return {
          phone: values.phone || undefined,
          whatsapp: values.whatsapp || undefined,
        };
      }
      case 'address': {
        const values = this.addressForm.getRawValue();
        return {
          address_line1: values.address_line1 || undefined,
          address_line2: values.address_line2 || undefined,
          city: values.city || undefined,
          state: values.state || undefined,
          postal_code: values.postal_code || undefined,
          country: values.country || undefined,
        };
      }
      case 'license': {
        const values = this.licenseForm.getRawValue();
        return {
          driver_license_number: values.driver_license_number || undefined,
          driver_license_country: values.driver_license_country || undefined,
          driver_license_expiry: values.driver_license_expiry || undefined,
        };
      }
    }
  }

  /**
   * Save step silently (for autosave)
   */
  private async saveStepSilently(
    step: WizardStep,
    updates: Partial<UpdateProfileData>,
  ): Promise<void> {
    try {
      await this.profileStore.updateProfile(updates);
      // Mark as dirty but don't show toast
      const dirty = new Set(this.dirtySteps());
      dirty.add(step);
      this.dirtySteps.set(dirty);
    } catch (err) {
      // Silent failure for autosave
      console.warn(`Autosave failed for step ${step}:`, err);
    }
  }

  /**
   * Save current step with optimistic update
   */
  async saveCurrentStep(): Promise<void> {
    const step = this.currentStep();

    if (!this.canGoNext()) {
      this.markFormAsTouched(step);
      return;
    }

    this.savingStep.set(step);
    const formData = this.getFormDataForStep(step);

    // Optimistic update
    const currentProfile = this.profileStore.profile();
    if (currentProfile) {
      this.profileStore.profile.set({
        ...currentProfile,
        ...formData,
      } as any);
    }

    try {
      await this.profileStore.updateProfile(formData);

      // Mark step as completed
      const completed = new Set(this.completedSteps());
      completed.add(step);
      this.completedSteps.set(completed);

      // Mark as dirty
      const dirty = new Set(this.dirtySteps());
      dirty.add(step);
      this.dirtySteps.set(dirty);

      // Show success toast
      this.toastService.success(
        'Paso guardado',
        `Información de ${this.getStepLabel(step)} guardada exitosamente`,
      );

      // Track analytics
      this.analytics.trackEvent('cta_clicked', {
        action: 'profile_step_saved',
        step,
        step_index: this.currentStepIndex() + 1,
      });

      // Auto-advance to next step if not last
      if (!this.isLastStep()) {
        this.nextStep();
      } else {
        // Last step completed
        this.completeWizard.emit();
      }
    } catch (err) {
      // Rollback on error
      await this.profileStore.refresh();
      const errorMessage = err instanceof Error ? err.message : 'No pudimos guardar los cambios.';
      this.toastService.error('Error al guardar', errorMessage);

      // Track analytics
      this.analytics.trackEvent('cta_clicked', {
        action: 'profile_step_save_failed',
        step,
        error: errorMessage,
      });
    } finally {
      this.savingStep.set(null);
    }
  }

  /**
   * Navigate to next step
   */
  nextStep(): void {
    if (!this.canGoNext()) {
      this.markFormAsTouched(this.currentStep());
      return;
    }

    const currentIndex = this.currentStepIndex();
    if (currentIndex < this.steps.length - 1) {
      const nextStep = this.steps[currentIndex + 1];
      this.currentStep.set(nextStep.id);
    }
  }

  /**
   * Navigate to previous step
   */
  previousStep(): void {
    if (this.canGoPrevious()) {
      const currentIndex = this.currentStepIndex();
      const previousStep = this.steps[currentIndex - 1];
      this.currentStep.set(previousStep.id);
    }
  }

  /**
   * Go to specific step (only if completed or previous step)
   */
  goToStep(step: WizardStep): void {
    if (this.saving()) return;

    const targetIndex = this.steps.findIndex((s) => s.id === step);
    const currentIndex = this.currentStepIndex();

    // Allow navigation to:
    // 1. Current step
    // 2. Previous steps
    // 3. Next step if current is completed
    if (
      targetIndex === currentIndex ||
      targetIndex < currentIndex ||
      (targetIndex === currentIndex + 1 && this.isStepCompleted(this.currentStep()))
    ) {
      this.currentStep.set(step);
    }
  }

  /**
   * Cancel wizard
   */
  onCancelClick(): void {
    // Restore original profile
    void this.profileStore.refresh();
    this.cancelWizard.emit();
  }

  /**
   * Mark form as touched for validation
   */
  private markFormAsTouched(step: WizardStep): void {
    switch (step) {
      case 'general':
        this.generalForm.markAllAsTouched();
        break;
      case 'contact':
        this.contactForm.markAllAsTouched();
        break;
      case 'address':
        this.addressForm.markAllAsTouched();
        break;
      case 'license':
        this.licenseForm.markAllAsTouched();
        break;
    }
  }

  /**
   * Get step label
   */
  private getStepLabel(step: WizardStep): string {
    return this.steps.find((s) => s.id === step)?.label ?? step;
  }

  /**
   * Check if step is completed
   */
  isStepCompleted(step: WizardStep): boolean {
    return this.completedSteps().has(step);
  }

  /**
   * Check if step is dirty
   */
  isStepDirty(step: WizardStep): boolean {
    return this.dirtySteps().has(step);
  }

  /**
   * Get step status icon
   */
  getStepStatusIcon(step: WizardStep): string {
    if (this.isStepCompleted(step)) {
      return 'check-circle';
    }
    if (this.isStepDirty(step)) {
      return 'edit';
    }
    return 'circle';
  }
}
