import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FeatureDataFacadeService } from '@core/services/facades/feature-data-facade.service';
import { SessionFacadeService } from '@core/services/facades/session-facade.service';

interface InsuranceCarRow {
  id: string;
  brand: string;
  model: string;
  year: number;
  status: string;
  insurance_policy_number: string | null;
  insurance_expires_at: string | null;
}

@Component({
  selector: 'app-insurance-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './insurance.page.html',
  styleUrls: ['./insurance.page.css'],
})
export class InsurancePage implements OnInit {
  private readonly sessionFacade = inject(SessionFacadeService);
  private readonly featureData = inject(FeatureDataFacadeService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly cars = signal<InsuranceCarRow[]>([]);

  async ngOnInit(): Promise<void> {
    await this.loadCars();
  }

  async loadCars(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const user = await this.sessionFacade.getCurrentUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const data = await this.featureData.getInsuranceCarsByOwner(user.id);
      this.cars.set((data as unknown as InsuranceCarRow[]) || []);
    } catch (err) {
      this.error.set('No pudimos cargar los autos. Intentá de nuevo.');
      console.error('Error loading cars:', err);
    } finally {
      this.loading.set(false);
    }
  }

  isInsuranceExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return true;
    return new Date(expiresAt) < new Date();
  }

  getInsuranceStatus(expiresAt: string | null): 'valid' | 'expired' | 'missing' {
    if (!expiresAt) return 'missing';
    if (this.isInsuranceExpired(expiresAt)) return 'expired';
    return 'valid';
  }
}
