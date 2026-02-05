import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProfileService } from '@core/services/auth/profile.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { CarBrandsService } from '@core/services/cars/car-brands.service';
import { PricingService } from '@core/services/payments/pricing.service';
import { FipeAutocompleteComponent, FipeAutocompleteOption } from '../fipe-autocomplete/fipe-autocomplete.component';


@Component({
  selector: 'app-smart-onboarding',
  standalone: true,
  imports: [CommonModule, FipeAutocompleteComponent],
  templateUrl: './smart-onboarding.component.html',
  styles: [`
    :host { display: block; height: 100vh; overflow: hidden; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmartOnboardingComponent implements OnInit {
  @Input() userRole?: string;
  @Output() completed = new EventEmitter<unknown>();

  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);
  private readonly carBrandsService = inject(CarBrandsService);
  private readonly pricingService = inject(PricingService);
  private readonly logger = inject(LoggerService);

  // --- STATE ---
  readonly currentStep = signal<number>(1);
  readonly role = signal<'owner' | 'renter' | 'both' | null>(null);

  /** Total steps varies by role: renter=5 (role, purpose, zone, notif, loading), owner/both=4 */
  readonly totalSteps = computed(() => this.role() === 'renter' ? 5 : 4);

  // Owner Data
  readonly selectedBrand = signal<FipeAutocompleteOption | null>(null);
  readonly selectedModel = signal<FipeAutocompleteOption | null>(null);
  readonly selectedYear = signal<number | null>(null);
  readonly estimatedEarnings = signal<number | null>(null);
  readonly loadingModels = signal(false);
  readonly loadingValue = signal(false);

  // Renter Data
  readonly renterPurpose = signal<string>('');
  readonly renterLocation = signal<string>('');

  // Shared
  readonly loading = signal(false);

  // Options
  readonly brandOptions = computed<FipeAutocompleteOption[]>(() =>
    this.carBrandsService.getCarBrands().map(b => ({ code: b.code, name: b.name }))
  );

  readonly modelOptions = signal<FipeAutocompleteOption[]>([]);
  readonly yearOptions = signal<FipeAutocompleteOption[]>([]); // Will generate range

  // --- EFFECTS ---
  constructor() {
    // Generate Year Options (Last 15 years)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 15 }, (_, i) => currentYear - i);
    this.yearOptions.set(years.map(y => ({ code: y.toString(), name: y.toString() })));

    // Load models when brand changes
    effect(async () => {
      const brand = this.selectedBrand();
      if (!brand) {
        this.modelOptions.set([]);
        return;
      }

      this.loadingModels.set(true);
      try {
        const models = await this.pricingService.getFipeModels(brand.code);
        this.modelOptions.set(models.map(m => ({ code: m.code, name: m.name })));
      } catch (err) {
        this.logger.error('Error loading models', err);
      } finally {
        this.loadingModels.set(false);
      }
    }, { allowSignalWrites: true });

    // Calculate earnings when car data is complete
    effect(async () => {
      const brand = this.selectedBrand();
      const model = this.selectedModel();
      const year = this.selectedYear();

      if (brand && model && year) {
        this.calculateEarnings(brand.name, model.name, year);
      }
    });
  }

  ngOnInit() {
    // Check if userRole input is provided
    if (this.userRole) {
      // Pre-select if needed
    }
  }

  // --- ACTIONS ---

  selectRole(r: 'owner' | 'renter' | 'both') {
    this.role.set(r);
    this.nextStep();
  }

  onBrandSelected(option: FipeAutocompleteOption) {
    this.selectedBrand.set(option);
    this.selectedModel.set(null); // Reset model
    this.selectedYear.set(null); // Reset year
  }

  onModelSelected(option: FipeAutocompleteOption) {
    this.selectedModel.set(option);
  }

  onYearSelected(option: FipeAutocompleteOption) {
    this.selectedYear.set(parseInt(option.code));
  }

  selectPurpose(purpose: string) {
    this.renterPurpose.set(purpose);
    // Auto-advance after visual feedback
    setTimeout(() => this.nextStep(), 300);
  }

  selectLocation(loc: string) {
    this.renterLocation.set(loc);
    // Auto-advance after visual feedback
    setTimeout(() => this.nextStep(), 300);
  }

  async calculateEarnings(brand: string, model: string, year: number) {
    this.loadingValue.set(true);
    try {
      const result = await this.pricingService.getFipeValueRealtime({
        brand,
        model,
        year,
        country: 'AR'
      });

      const valueUsd = result?.data?.value_usd;

      if (valueUsd) {
        // Regla de dedo: 5% del valor del auto por mes si se alquila full time
        // O más conservador: $50 USD / día * 10 días = $500 USD
        // Usemos una fórmula basada en el valor del auto.
        // ROI anual ~60%. ROI mensual ~5%.
        const estimatedMonthly = valueUsd * 0.05; // 5% mensual
        this.estimatedEarnings.set(Math.round(estimatedMonthly));
      } else {
        // Fallback value
        this.estimatedEarnings.set(450); // $450 USD default
      }
    } catch {
      this.estimatedEarnings.set(400);
    } finally {
      this.loadingValue.set(false);
    }
  }

  nextStep() {
    const max = this.totalSteps();
    this.currentStep.update(s => Math.min(s + 1, max));
    if (this.currentStep() === max) {
      this.completeOnboarding();
    }
  }

  prevStep() {
    this.currentStep.update(s => Math.max(s - 1, 1));
  }

  skip() {
    this.completeOnboarding(true);
  }

  private async completeOnboarding(_skipped = false) {
    this.loading.set(true);
    try {
      // Save profile logic
      // ...

      await this.profileService.completeOnboarding();
      this.finishRedirect();
    } catch (err) {
      this.logger.error('Onboarding error', err);
      this.finishRedirect();
    } finally {
      this.loading.set(false);
    }
  }

  private finishRedirect() {
    const role = this.role();
    if (role === 'owner' || role === 'both') {
      this.router.navigate(['/cars/publish']);
    } else {
      this.router.navigate(['/cars/list']);
    }
  }

  // --- HELPERS ---

  /** Owner car data step (step 2 for owner/both) */
  get showOwnerStep() {
    return this.currentStep() === 2 && (this.role() === 'owner' || this.role() === 'both');
  }

  /** Renter purpose selection (step 2 for renter) */
  get showRenterPurposeStep() {
    return this.currentStep() === 2 && this.role() === 'renter';
  }

  /** Renter zone selection (step 3 for renter) */
  get showRenterZoneStep() {
    return this.currentStep() === 3 && this.role() === 'renter';
  }

  /** Notifications step: step 3 for owner/both, step 4 for renter */
  get showNotificationsStep() {
    if (this.role() === 'renter') return this.currentStep() === 4;
    return this.currentStep() === 3;
  }

  /** Loading step: step 4 for owner/both, step 5 for renter */
  get showLoadingStep() {
    return this.currentStep() === this.totalSteps();
  }

  /** Only owner path needs a continue button (multi-field form) */
  get canContinueStep2() {
    if (this.showOwnerStep) {
      return this.selectedBrand() && this.selectedModel() && this.selectedYear();
    }
    return false;
  }
}
