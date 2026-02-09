import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CarsService } from '@core/services/cars/cars.service';
import { PricingService } from '@core/services/payments/pricing.service';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline,
  carSportOutline,
  trendingUpOutline,
  shieldCheckmarkOutline,
  flashOutline,
  sparklesOutline,
} from 'ionicons/icons';
import {
  FipeAutocompleteComponent,
  FipeAutocompleteOption,
} from '../../shared/components/fipe-autocomplete/fipe-autocomplete.component';
import { LeadCaptureFormComponent } from '../../shared/components/lead-capture-form/lead-capture-form.component';

@Component({
  selector: 'app-owners-landing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FipeAutocompleteComponent, IonIcon, LeadCaptureFormComponent],
  templateUrl: './owners-landing.page.html',
  styleUrls: ['./owners-landing.page.scss'],
})
export class OwnersLandingPage implements OnInit {
  private readonly router = inject(Router);
  private readonly carsService = inject(CarsService);
  private readonly pricingService = inject(PricingService);

  // State
  readonly brands = signal<FipeAutocompleteOption[]>([]);
  readonly models = signal<FipeAutocompleteOption[]>([]);
  readonly isLoadingBrands = signal(false);
  readonly isLoadingModels = signal(false);

  readonly selectedBrand = signal<FipeAutocompleteOption | null>(null);
  readonly selectedModel = signal<FipeAutocompleteOption | null>(null);
  readonly selectedYear = signal<number | null>(null);

  readonly estimatedEarnings = signal<number | null>(null);
  readonly isCalculating = signal(false);

  // Available years (last 25 years)
  readonly years = Array.from({ length: 26 }, (_, i) => new Date().getFullYear() - i);

  constructor() {
    addIcons({
      cashOutline,
      carSportOutline,
      trendingUpOutline,
      shieldCheckmarkOutline,
      flashOutline,
      sparklesOutline,
    });
  }

  async ngOnInit() {
    this.isLoadingBrands.set(true);
    try {
      const dbBrands = await this.carsService.getCarBrands();
      this.brands.set(dbBrands.map((b) => ({ code: b.id, name: b.name })));
    } finally {
      this.isLoadingBrands.set(false);
    }
  }

  async onBrandSelected(brand: FipeAutocompleteOption) {
    if (!brand.code) {
      this.selectedBrand.set(null);
      this.models.set([]);
      this.selectedModel.set(null);
      this.estimatedEarnings.set(null);
      return;
    }

    this.selectedBrand.set(brand);
    this.isLoadingModels.set(true);
    try {
      const dbModels = await this.carsService.getCarModels(brand.code);
      this.models.set(dbModels.map((m) => ({ code: m.id, name: m.name })));
    } finally {
      this.isLoadingModels.set(false);
    }

    this.calculatePotential();
  }

  onModelSelected(model: FipeAutocompleteOption) {
    if (!model.code) {
      this.selectedModel.set(null);
      this.estimatedEarnings.set(null);
      return;
    }
    this.selectedModel.set(model);
    this.calculatePotential();
  }

  onYearSelected(event: Event) {
    const target = event.target as HTMLSelectElement;
    const year = parseInt(target.value);
    this.selectedYear.set(year || null);
    this.calculatePotential();
  }

  async calculatePotential() {
    const brand = this.selectedBrand();
    const model = this.selectedModel();
    const year = this.selectedYear();

    if (!brand || !model || !year) return;

    this.isCalculating.set(true);
    try {
      // Use PricingService estimation logic
      const result = await this.pricingService.estimateVehicleValue({
        brand: brand.name,
        model: model.name,
        year: year,
      });

      if (result?.suggested_daily_rate_usd) {
        // Calculate monthly (assuming 15 days of rental as optimistic but realistic goal for landing)
        this.estimatedEarnings.set(Math.round(result.suggested_daily_rate_usd * 15));
      } else {
        // Fallback
        this.estimatedEarnings.set(350);
      }
    } catch (error) {
      console.error('Error estimating earnings:', error);
      this.estimatedEarnings.set(null);
    } finally {
      this.isCalculating.set(false);
    }
  }

  startPublishing() {
    const brand = this.selectedBrand();
    const model = this.selectedModel();
    const year = this.selectedYear();

    this.router.navigate(['/cars/publish'], {
      queryParams: {
        brand_id: brand?.code,
        model_id: model?.code,
        year: year,
        from_landing: 'true',
      },
    });
  }
}
