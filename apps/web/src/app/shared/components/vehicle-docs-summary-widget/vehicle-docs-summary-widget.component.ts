import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  VehicleDocumentsService,
  VehicleDocument,
} from '@core/services/verification/vehicle-documents.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

interface CarDocStatus {
  carId: string;
  carTitle: string;
  carImage?: string;
  hasGreenCard: boolean;
  hasVtv: boolean;
  hasInsurance: boolean;
  vtvExpiringSoon: boolean;
  insuranceExpiringSoon: boolean;
  missingCount: number;
}

@Component({
  selector: 'app-vehicle-docs-summary-widget',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="animate-pulse space-y-3">
        <div class="h-4 bg-surface-base rounded w-1/3"></div>
        <div class="h-20 bg-surface-base rounded"></div>
      </div>
    } @else if (cars().length > 0) {
      <div
        class="bg-surface-raised rounded-xl sm:rounded-2xl border border-border-default shadow-sm"
      >
        <!-- Header -->
        <div class="p-4 sm:p-5 border-b border-border-default">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 sm:gap-3">
              <div class="p-2 bg-warning-bg text-warning-strong rounded-lg">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 class="text-sm sm:text-base font-bold text-text-primary">
                  Documentos de Vehículos
                </h3>
                <p class="text-xs text-text-secondary">Cédula verde, VTV y seguro de tus autos</p>
              </div>
            </div>
            @if (totalMissing() > 0) {
              <span
                class="px-2 py-1 text-xs font-bold bg-warning-light/20 text-warning-strong rounded-full"
              >
                {{ totalMissing() }} pendientes
              </span>
            }
          </div>
        </div>

        <!-- Car list -->
        <div class="divide-y divide-border-default">
          @for (car of cars(); track car.carId) {
            <a
              [routerLink]="['/cars', car.carId, 'documents']"
              class="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-surface-base transition-colors group"
            >
              <!-- Car thumbnail -->
              <div
                class="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-surface-base flex-shrink-0"
              >
                @if (car.carImage) {
                  <img
                    [src]="car.carImage"
                    [alt]="car.carTitle"
                    class="w-full h-full object-cover"
                  />
                } @else {
                  <div class="w-full h-full flex items-center justify-center text-text-secondary">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                }
              </div>

              <!-- Car info -->
              <div class="flex-grow min-w-0">
                <p
                  class="text-sm font-medium text-text-primary truncate group-hover:text-primary-600 transition-colors"
                >
                  {{ car.carTitle }}
                </p>
                <!-- Document status indicators -->
                <div class="flex items-center gap-2 mt-1.5">
                  <!-- Green Card -->
                  <span
                    class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                    [class.bg-success-light/20]="car.hasGreenCard"
                    [class.text-success-strong]="car.hasGreenCard"
                    [class.bg-surface-secondary]="!car.hasGreenCard"
                    [class.text-text-secondary]="!car.hasGreenCard"
                    [title]="
                      car.hasGreenCard ? 'Cédula verde verificada' : 'Cédula verde pendiente'
                    "
                  >
                    @if (car.hasGreenCard) {
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fill-rule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    }
                    Cédula
                  </span>

                  <!-- VTV -->
                  <span
                    class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                    [class.bg-success-light/20]="car.hasVtv && !car.vtvExpiringSoon"
                    [class.text-success-strong]="car.hasVtv && !car.vtvExpiringSoon"
                    [class.bg-warning-light/20]="car.hasVtv && car.vtvExpiringSoon"
                    [class.text-warning-strong]="car.hasVtv && car.vtvExpiringSoon"
                    [class.bg-surface-secondary]="!car.hasVtv"
                    [class.text-text-secondary]="!car.hasVtv"
                    [title]="
                      !car.hasVtv
                        ? 'VTV pendiente'
                        : car.vtvExpiringSoon
                          ? 'VTV por vencer'
                          : 'VTV vigente'
                    "
                  >
                    @if (car.hasVtv && !car.vtvExpiringSoon) {
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fill-rule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    } @else if (car.vtvExpiringSoon) {
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fill-rule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    }
                    VTV
                  </span>

                  <!-- Insurance -->
                  <span
                    class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                    [class.bg-success-light/20]="car.hasInsurance && !car.insuranceExpiringSoon"
                    [class.text-success-strong]="car.hasInsurance && !car.insuranceExpiringSoon"
                    [class.bg-warning-light/20]="car.hasInsurance && car.insuranceExpiringSoon"
                    [class.text-warning-strong]="car.hasInsurance && car.insuranceExpiringSoon"
                    [class.bg-surface-secondary]="!car.hasInsurance"
                    [class.text-text-secondary]="!car.hasInsurance"
                    [title]="
                      !car.hasInsurance
                        ? 'Seguro pendiente'
                        : car.insuranceExpiringSoon
                          ? 'Seguro por vencer'
                          : 'Seguro vigente'
                    "
                  >
                    @if (car.hasInsurance && !car.insuranceExpiringSoon) {
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fill-rule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    } @else if (car.insuranceExpiringSoon) {
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fill-rule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    }
                    Seguro
                  </span>
                </div>
              </div>

              <!-- Arrow -->
              <svg
                class="w-5 h-5 text-text-secondary group-hover:text-primary-600 transition-colors flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          }
        </div>
      </div>
    }
  `,
})
export class VehicleDocsSummaryWidgetComponent implements OnInit {
  private readonly supabase = injectSupabase();
  private readonly vehicleDocsService = inject(VehicleDocumentsService);

  readonly loading = signal(true);
  readonly cars = signal<CarDocStatus[]>([]);
  readonly totalMissing = signal(0);

  async ngOnInit(): Promise<void> {
    await this.loadCarsWithDocStatus();
  }

  private async loadCarsWithDocStatus(): Promise<void> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) {
        this.loading.set(false);
        return;
      }

      // Get user's cars
      const { data: userCars, error: carsError } = await this.supabase
        .from('cars')
        .select('id, title, brand, model, images')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (carsError || !userCars?.length) {
        this.loading.set(false);
        return;
      }

      // Get documents for all cars
      const carIds = userCars.map((c) => c.id);
      const { data: docs } = await this.supabase
        .from('vehicle_documents')
        .select(
          'vehicle_id, green_card_verified_at, vtv_verified_at, vtv_expiry, insurance_verified_at, insurance_expiry',
        )
        .in('vehicle_id', carIds);

      const docsMap = new Map<string, VehicleDocument>();
      docs?.forEach((d) => docsMap.set(d.vehicle_id, d as VehicleDocument));

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      let totalMissingCount = 0;

      const carStatuses: CarDocStatus[] = userCars.map((car) => {
        const doc = docsMap.get(car.id);
        const carTitle = car.title || `${car.brand || ''} ${car.model || ''}`.trim() || 'Auto';
        const carImage = car.images?.[0] || undefined;

        const hasGreenCard = !!doc?.green_card_verified_at;
        const hasVtv = !!doc?.vtv_verified_at;
        const hasInsurance = !!doc?.insurance_verified_at;

        const vtvExpiry = doc?.vtv_expiry ? new Date(doc.vtv_expiry) : null;
        const insuranceExpiry = doc?.insurance_expiry ? new Date(doc.insurance_expiry) : null;

        const vtvExpiringSoon =
          hasVtv && vtvExpiry && vtvExpiry > now && vtvExpiry <= thirtyDaysFromNow;
        const insuranceExpiringSoon =
          hasInsurance &&
          insuranceExpiry &&
          insuranceExpiry > now &&
          insuranceExpiry <= thirtyDaysFromNow;

        let missingCount = 0;
        if (!hasGreenCard) missingCount++;
        if (!hasVtv) missingCount++;
        if (!hasInsurance) missingCount++;

        totalMissingCount += missingCount;

        return {
          carId: car.id,
          carTitle,
          carImage,
          hasGreenCard,
          hasVtv,
          hasInsurance,
          vtvExpiringSoon: !!vtvExpiringSoon,
          insuranceExpiringSoon: !!insuranceExpiringSoon,
          missingCount,
        };
      });

      this.cars.set(carStatuses);
      this.totalMissing.set(totalMissingCount);
    } catch (error) {
      console.error('Error loading car documents status:', error);
    } finally {
      this.loading.set(false);
    }
  }
}
