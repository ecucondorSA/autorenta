import { CommonModule } from '@angular/common';
import {Component, inject, OnInit, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';

@Component({
  selector: 'app-insurance-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './insurance.page.html',
  styleUrls: ['./insurance.page.css'],
})
export class InsurancePage implements OnInit {
  private readonly supabase = inject(SupabaseClientService).getClient();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly cars = signal<any[]>([]);

  async ngOnInit(): Promise<void> {
    await this.loadCars();
  }

  async loadCars(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const user = await this.supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error: carsError } = await this.supabase
        .from('cars')
        .select('id, brand, model, year, status, insurance_policy_number, insurance_expires_at')
        .eq('owner_id', user.data.user.id)
        .order('created_at', { ascending: false });

      if (carsError) {
        throw carsError;
      }

      this.cars.set(data || []);
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
