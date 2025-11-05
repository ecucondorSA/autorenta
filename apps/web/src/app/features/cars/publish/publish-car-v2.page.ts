import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ModalController, AlertController } from '@ionic/angular/standalone';
import { CarsService } from '../../../core/services/cars.service';
import { GeocodingService } from '../../../core/services/geocoding.service';
import { AiPhotoEnhancerService } from '../../../core/services/ai-photo-enhancer.service';
import {
  MarketplaceOnboardingService,
  MarketplaceStatus,
} from '../../../core/services/marketplace-onboarding.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';
import { Car, CarBrand, CarModel } from '../../../core/models';
import { Transmission, FuelType, CarStatus } from '../../../core/types/database.types';
import { HostSupportInfoPanelComponent } from '../../../shared/components/host-support-info-panel/host-support-info-panel.component';
import { MpOnboardingModalComponent } from '../../../shared/components/mp-onboarding-modal/mp-onboarding-modal.component';

@Component({
  selector: 'app-publish-car-v2',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, HostSupportInfoPanelComponent],
  template: `
    <div
      class="min-h-screen bg-gray-50 dark:bg-graphite-dark py-8 px-4 transition-colors duration-300 text-gray-900 dark:text-pearl-light"
    >
      <div class="max-w-6xl mx-auto">
        <!-- Hero -->
        <div class="grid gap-6 mb-8 lg:grid-cols-5">
          <div
            class="lg:col-span-3 bg-white dark:bg-anthracite rounded-2xl shadow-soft border border-pearl-gray/70 dark:border-neutral-800/70 p-6 transition-colors"
          >
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p
                  class="text-xs uppercase tracking-wide text-charcoal-medium/70 dark:text-pearl-light/60"
                >
                  Publicar Auto
                </p>
                <h1 class="text-3xl font-bold text-gray-900 dark:text-ivory-luminous mt-1">
                  {{ editMode() ? 'Editar Auto' : 'Completa la información de tu vehículo' }}
                </h1>
                <p class="text-sm text-gray-600 dark:text-pearl-light/75 mt-2 max-w-xl">
                  Ingresá datos del vehículo, condiciones y fotos. Este flujo te guía para que la
                  publicación quede lista para revisión.
                </p>
              </div>
              <div class="hidden sm:flex flex-col text-right">
                <p class="text-xs text-charcoal-medium/70 dark:text-pearl-light/60">Paso 2 de 2</p>
                <div class="flex items-center gap-2 mt-2">
                  <span class="h-2 rounded-full bg-primary-600 dark:bg-accent-petrol w-14"></span>
                  <span class="h-2 rounded-full bg-primary-100 dark:bg-neutral-700 w-6"></span>
                </div>
              </div>
            </div>

            <div class="mt-6 grid gap-4 sm:grid-cols-3">
              <div class="rounded-xl border border-pearl-gray/70 dark:border-neutral-800/70 p-4">
                <p
                  class="text-xs uppercase tracking-wide text-charcoal-medium/70 dark:text-pearl-light/60"
                >
                  Fotos listas
                </p>
                <p class="text-2xl font-bold text-accent-petrol dark:text-accent-petrol/80">
                  {{ uploadedPhotos().length }}/10
                </p>
                <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
                  Necesitás al menos 3
                </p>
              </div>
              <div class="rounded-xl border border-pearl-gray/70 dark:border-neutral-800/70 p-4">
                <p
                  class="text-xs uppercase tracking-wide text-charcoal-medium/70 dark:text-pearl-light/60"
                >
                  Revisión estimada
                </p>
                <p class="text-2xl font-bold text-accent-warm dark:text-accent-warm/90">24-48h</p>
                <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
                  Te avisamos por mail cada cambio
                </p>
              </div>
              <div class="rounded-xl border border-pearl-gray/70 dark:border-neutral-800/70 p-4">
                <p
                  class="text-xs uppercase tracking-wide text-charcoal-medium/70 dark:text-pearl-light/60"
                >
                  Comisión
                </p>
                <p class="text-2xl font-bold text-accent-petrol dark:text-accent-petrol/80">
                  15-25%
                </p>
                <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
                  Dependiendo de categoría
                </p>
              </div>
            </div>

            <div
              *ngIf="editMode()"
              class="mt-4 bg-amber-50/90 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-400/50 rounded-lg p-3 flex items-start gap-2"
            >
              <span class="text-amber-600 dark:text-amber-200 text-lg">✏️</span>
              <div class="flex-1">
                <p class="text-sm text-amber-800 dark:text-amber-100 font-medium">Modo edición</p>
                <p class="text-xs text-amber-600 dark:text-amber-100/80 mt-1">
                  Estás editando un auto existente. Los cambios se guardan al enviar el formulario.
                </p>
              </div>
            </div>
            <div
              *ngIf="autofilledFromLast() && !editMode()"
              class="mt-4 bg-accent-petrol/10 dark:bg-accent-petrol/15 border border-accent-petrol/30 dark:border-accent-petrol/40 rounded-lg p-3 flex items-start gap-2"
            >
              <span class="text-accent-petrol dark:text-ivory-luminous text-lg">ℹ️</span>
              <div class="flex-1">
                <p class="text-sm text-accent-petrol dark:text-ivory-luminous font-medium">
                  Datos autocompletados
                </p>
                <p class="text-xs text-accent-petrol/80 dark:text-pearl-light/80 mt-1">
                  Usamos tu última publicación para ahorrar tiempo. Revisá marca, modelo y fotos
                  antes de confirmar.
                </p>
              </div>
            </div>

            <div
              *ngIf="mpStatusLoading()"
              class="mt-4 flex items-center gap-3 rounded-lg border border-pearl-gray/50 bg-white/70 p-3 text-sm text-charcoal-medium dark:border-neutral-700 dark:bg-anthracite/60 dark:text-pearl-light/80"
            >
              <span
                class="inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-accent-petrol"
              ></span>
              Comprobando el estado de tu cuenta de Mercado Pago...
            </div>

            <div
              *ngIf="mpStatusError()"
              class="mt-4 rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-800 dark:border-red-500/60 dark:bg-red-500/10 dark:text-red-200"
            >
              <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div class="flex items-start gap-2">
                  <span class="text-lg">⚠️</span>
                  <div>
                    <p class="font-semibold">No pudimos verificar Mercado Pago</p>
                    <p class="text-xs md:text-sm">
                      {{ mpStatusError() }}. Intentá nuevamente en unos minutos o volvé a vincular
                      tu cuenta.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  class="rounded-lg border border-red-300/80 px-4 py-2 text-xs font-semibold text-red-800 transition hover:bg-red-100/80 dark:border-red-400/50 dark:bg-transparent dark:text-red-100 dark:hover:bg-red-500/20"
                  (click)="openOnboardingModal()"
                >
                  Reintentar vinculación
                </button>
              </div>
            </div>

            <div
              *ngIf="showMpBanner()"
              class="mt-4 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-5 text-sm text-amber-900 shadow-sm dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100"
            >
              <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div class="flex items-start gap-3">
                  <span class="text-2xl leading-none">🔒</span>
                  <div class="space-y-1">
                    <p class="text-base font-semibold">Conectá Mercado Pago para activar tu auto</p>
                    <p class="text-xs md:text-sm md:max-w-xl">
                      Guardaremos la publicación como borrador hasta que completes el onboarding.
                      Sin esa vinculación las reservas quedan pendientes y el dinero no se
                      distribuye automáticamente.
                    </p>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-lg bg-accent-petrol px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-accent-petrol/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-petrol"
                    (click)="openOnboardingModal()"
                  >
                    Vincular Mercado Pago
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-amber-800/80 transition hover:bg-amber-100/80 dark:text-amber-100/90 dark:hover:bg-amber-500/25"
                    (click)="dismissOnboardingReminder()"
                  >
                    Recordarme luego
                  </button>
                </div>
              </div>
            </div>

            <div
              *ngIf="!mpStatusLoading() && mpReady()"
              class="mt-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-5 text-sm text-emerald-900 shadow-sm dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-100"
            >
              <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div class="flex items-start gap-3">
                  <span class="text-2xl leading-none">✅</span>
                  <div class="space-y-1">
                    <p class="text-base font-semibold">Mercado Pago vinculado correctamente</p>
                    <p class="text-xs md:text-sm md:max-w-xl">
                      Recibirás pagos automáticos con split inmediato en cada reserva confirmada.
                    </p>
                    <p
                      *ngIf="mpStatus()?.collectorId"
                      class="text-xs text-emerald-800/80 dark:text-emerald-100/80"
                    >
                      Collector ID: {{ mpStatus()?.collectorId }}
                    </p>
                    <p
                      *ngIf="mpStatus()?.completedAt"
                      class="text-xs text-emerald-800/80 dark:text-emerald-100/80"
                    >
                      Onboarding completado
                      {{ mpStatus()?.completedAt | date: 'dd/MM/yyyy HH:mm' }}.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  class="rounded-lg border border-emerald-300/60 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-400/40 dark:text-emerald-100 dark:hover:bg-emerald-500/25"
                  (click)="openOnboardingModal()"
                >
                  Ver opciones
                </button>
              </div>
            </div>
          </div>

          <div
            class="lg:col-span-2 rounded-2xl border border-pearl-gray/70 dark:border-neutral-800/70 bg-gradient-to-br from-sand-light to-ivory-soft dark:from-slate-deep/40 dark:to-anthracite p-6 shadow-soft"
          >
            <h3
              class="text-lg font-semibold text-smoke-black dark:text-ivory-luminous mb-3 flex items-center gap-2"
            >
              <span>🧭</span> Checklist rápido
            </h3>
            <ul class="space-y-3 text-sm text-charcoal-medium dark:text-pearl-light/80">
              <li class="flex items-start gap-2">
                <span class="text-accent-petrol mt-0.5">•</span>Subí al menos 3 fotos con buena
                iluminación.
              </li>
              <li class="flex items-start gap-2">
                <span class="text-accent-petrol mt-0.5">•</span>Ingresá el valor estimado para
                calcular seguros y depósitos.
              </li>
              <li class="flex items-start gap-2">
                <span class="text-accent-petrol mt-0.5">•</span>Definí precios, mínimos y depósito
                según tu disponibilidad.
              </li>
              <li class="flex items-start gap-2">
                <span class="text-accent-petrol mt-0.5">•</span>Completá dirección exacta para
                habilitar mapa y retiro.
              </li>
            </ul>
            <div
              class="mt-5 rounded-xl bg-white dark:bg-anthracite border border-pearl-gray/50 dark:border-neutral-800/50 p-4 text-sm"
            >
              <p class="font-semibold text-smoke-black dark:text-ivory-luminous mb-2">Workflow</p>
              <ol
                class="list-decimal list-inside space-y-1 text-charcoal-medium dark:text-pearl-light/70"
              >
                <li>Información del vehículo</li>
                <li>Precio y condiciones</li>
                <li>Ubicación</li>
                <li>Fotos y revisión final</li>
              </ol>
            </div>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-5">
          <div class="lg:col-span-3">
            <!-- Main Form -->
            <form [formGroup]="publishForm" (ngSubmit)="onSubmit()" class="space-y-6">
              <!-- 1. Vehículo -->
              <div class="publish-card bg-white rounded-lg shadow-sm p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span class="text-2xl">🚗</span>
                  Información del Vehículo
                </h2>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Brand -->
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Marca *</label>
                    <select
                      formControlName="brand_id"
                      (change)="onBrandChange()"
                      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol focus:border-transparent"
                    >
                      <option value="">Selecciona una marca</option>
                      <option *ngFor="let brand of brands()" [value]="brand.id">
                        {{ brand.name }}
                      </option>
                    </select>
                  </div>

                  <!-- Model -->
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Modelo *</label>
                    <select
                      formControlName="model_id"
                      (change)="onModelChange()"
                      [disabled]="!publishForm.get('brand_id')?.value"
                      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Selecciona un modelo</option>
                      <option *ngFor="let model of filteredModels()" [value]="model.id">
                        {{ model.name }}
                      </option>
                    </select>
                    <p *ngIf="selectedModelInfo()" class="mt-1 text-xs text-gray-500">
                      {{ selectedModelInfo()?.category }} •
                      {{ selectedModelInfo()?.seats }} asientos •
                      {{ selectedModelInfo()?.doors }} puertas
                    </p>
                  </div>

                  <!-- Year -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Año *</label>
                    <input
                      type="number"
                      formControlName="year"
                      [min]="minYear"
                      [max]="maxYear"
                      placeholder="2024"
                      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol focus:border-transparent"
                    />
                  </div>

                  <!-- Mileage -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2"
                      >Kilometraje *</label
                    >
                    <input
                      type="number"
                      formControlName="mileage"
                      min="0"
                      placeholder="50000"
                      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol focus:border-transparent"
                    />
                  </div>

                  <!-- Color -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Color *</label>
                    <input
                      type="text"
                      formControlName="color"
                      placeholder="Ej: Blanco, Negro"
                      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol focus:border-transparent"
                    />
                  </div>

                  <!-- Transmission -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2"
                      >Transmisión *</label
                    >
                    <select
                      formControlName="transmission"
                      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol"
                    >
                      <option value="">Selecciona</option>
                      <option value="manual">Manual</option>
                      <option value="automatic">Automática</option>
                    </select>
                  </div>

                  <!-- Fuel -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2"
                      >Combustible *</label
                    >
                    <select
                      formControlName="fuel"
                      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol"
                    >
                      <option value="">Selecciona</option>
                      <option value="nafta">Nafta</option>
                      <option value="gasoil">Diesel</option>
                      <option value="electrico">Eléctrico</option>
                      <option value="hibrido">Híbrido</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- 2. Precio -->
              <div class="publish-card bg-white rounded-lg shadow-sm p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span class="text-2xl">💰</span>
                  Precio y Condiciones
                </h2>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Price per day -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2"
                      >Modo de precios *</label
                    >
                    <div class="grid xs:grid-cols-2 gap-3">
                      <button
                        type="button"
                        class="w-full rounded-xl border px-4 py-3 text-left transition"
                        [class.border-primary-600]="isDynamicPricing()"
                        [class.bg-primary-50]="isDynamicPricing()"
                        [class.text-primary-700]="isDynamicPricing()"
                        [class.border-gray-300]="!isDynamicPricing()"
                        (click)="setPricingStrategy('dynamic')"
                      >
                        <p class="text-sm font-semibold flex items-center gap-2">
                          Precio dinámico
                          <span
                            class="text-2xs uppercase tracking-wide bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full"
                            >Recomendado</span
                          >
                        </p>
                        <p class="text-xs text-gray-600 mt-1">
                          AutoRenta ajusta el valor según demanda y temporada.
                        </p>
                      </button>
                      <button
                        type="button"
                        class="w-full rounded-xl border px-4 py-3 text-left transition"
                        [class.border-primary-600]="!isDynamicPricing()"
                        [class.bg-primary-50]="!isDynamicPricing()"
                        [class.text-primary-700]="!isDynamicPricing()"
                        [class.border-gray-300]="isDynamicPricing()"
                        (click)="setPricingStrategy('custom')"
                      >
                        <p class="text-sm font-semibold">Precio personalizado</p>
                        <p class="text-xs text-gray-600 mt-1">
                          Definí manualmente el valor diario.
                        </p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"
                    >
                      Precio por día *
                      <span class="text-xs text-gray-500" *ngIf="isDynamicPricing()"
                        >(AutoRenta lo ajustará automáticamente)</span
                      >
                    </label>
                    <input
                      type="number"
                      formControlName="price_per_day"
                      min="1"
                      placeholder="50"
                      [readonly]="isDynamicPricing()"
                      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol focus:border-transparent disabled:bg-gray-100"
                    />
                    <p class="mt-1 text-xs text-gray-500" *ngIf="!isDynamicPricing()">
                      Puedes actualizar este valor cuando quieras desde tu panel.
                    </p>
                  </div>

                  <!-- Currency -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Moneda *</label>
                    <select
                      formControlName="currency"
                      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol"
                    >
                      <option value="USD">USD - Dólar</option>
                      <option value="ARS">ARS - Peso Argentino</option>
                      <option value="UYU">UYU - Peso Uruguayo</option>
                    </select>
                  </div>

                  <!-- ✅ NUEVO: Valor del Vehículo (USD) -->
                  <div class="md:col-span-2">
                    <label
                      class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"
                    >
                      Valor Estimado del Vehículo (USD) *
                      <span
                        class="text-xs text-gray-500 font-normal"
                        title="Este valor se usa para calcular seguros y garantías"
                        >ℹ️</span
                      >
                    </label>
                    <input
                      type="number"
                      formControlName="value_usd"
                      min="5000"
                      max="500000"
                      placeholder="15000"
                      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol focus:border-transparent"
                    />
                    <p class="mt-1 text-xs text-gray-500">
                      Ingresa el valor aproximado de mercado de tu vehículo. Este valor se usa para
                      calcular coberturas de seguro y depósitos de garantía.
                    </p>
                  </div>

                  <!-- Min rental days -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2"
                      >Días mínimos *</label
                    >
                    <input
                      type="number"
                      formControlName="min_rental_days"
                      min="1"
                      placeholder="1"
                      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol focus:border-transparent"
                    />
                  </div>

                  <!-- Max rental days -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Días máximos</label>
                    <input
                      type="number"
                      formControlName="max_rental_days"
                      min="1"
                      placeholder="30"
                      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol focus:border-transparent"
                    />
                    <p class="mt-1 text-xs text-gray-500">Dejar vacío = sin límite</p>
                  </div>

                  <!-- Deposit -->
                  <div class="md:col-span-2 border-t border-gray-200 pt-4">
                    <div class="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        formControlName="deposit_required"
                        id="deposit_required"
                        class="w-5 h-5 text-accent-petrol rounded focus:ring-2 focus:ring-accent-petrol"
                      />
                      <label
                        for="deposit_required"
                        class="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        Requiere depósito de garantía
                      </label>
                    </div>
                    <div *ngIf="publishForm.get('deposit_required')?.value">
                      <input
                        type="number"
                        formControlName="deposit_amount"
                        min="0"
                        placeholder="200"
                        class="w-full md:w-1/2 rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol focus:border-transparent"
                      />
                      <p class="mt-1 text-xs text-gray-500">Monto del depósito</p>
                    </div>
                  </div>

                  <!-- Insurance -->
                  <div class="md:col-span-2">
                    <div class="flex items-center gap-3">
                      <input
                        type="checkbox"
                        formControlName="insurance_included"
                        id="insurance_included"
                        class="w-5 h-5 text-accent-petrol rounded focus:ring-2 focus:ring-accent-petrol"
                      />
                      <label
                        for="insurance_included"
                        class="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        El seguro está incluido en el precio
                      </label>
                    </div>
                  </div>

                  <!-- Auto-approval -->
                  <div class="md:col-span-2">
                    <div
                      class="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700"
                    >
                      <input
                        type="checkbox"
                        formControlName="auto_approval"
                        id="auto_approval"
                        class="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-0.5"
                      />
                      <div class="flex-1">
                        <label
                          for="auto_approval"
                          class="text-sm font-medium text-gray-900 dark:text-ivory-luminous cursor-pointer block mb-1"
                        >
                          Aprobar reservas automáticamente
                        </label>
                        <p class="text-xs text-gray-600 dark:text-pearl-light/75">
                          Las reservas se aprobarán instantáneamente sin tu intervención. Si no está
                          activado, tendrás 24 horas para revisar y aprobar cada solicitud.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 3. Ubicación -->
              <div class="publish-card bg-white rounded-lg shadow-sm p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span class="text-2xl">📍</span>
                  Ubicación
                </h2>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <!-- Street -->
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Calle *</label>
                    <input
                      type="text"
                      formControlName="location_street"
                      placeholder="Ej: Av. Corrientes"
                      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol focus:border-transparent"
                    />
                  </div>

                  <!-- Street number -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Número *</label>
                    <input
                      type="text"
                      formControlName="location_street_number"
                      placeholder="1234"
                      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol focus:border-transparent"
                    />
                  </div>

                  <!-- City -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Ciudad *</label>
                    <input
                      type="text"
                      formControlName="location_city"
                      placeholder="Ej: Buenos Aires"
                      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol focus:border-transparent"
                    />
                  </div>

                  <!-- State -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Provincia *</label>
                    <input
                      type="text"
                      formControlName="location_state"
                      placeholder="Ej: Buenos Aires"
                      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol focus:border-transparent"
                    />
                  </div>

                  <!-- Country -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">País *</label>
                    <select
                      formControlName="location_country"
                      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-accent-petrol"
                    >
                      <option value="AR">Argentina</option>
                      <option value="UY">Uruguay</option>
                      <option value="BR">Brasil</option>
                      <option value="CL">Chile</option>
                      <option value="PY">Paraguay</option>
                    </select>
                  </div>
                </div>

                <!-- GPS Location Button - Minimalist -->
                <div class="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    (click)="useCurrentLocation()"
                    class="btn-secondary flex items-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    📍 Usar Mi Ubicación
                  </button>
                  <div *ngIf="manualCoordinates()" class="text-xs text-smoke-black">
                    ✓ GPS activo
                  </div>
                </div>
              </div>

              <!-- 4. Fotos -->
              <div
                class="publish-card bg-white dark:bg-anthracite rounded-2xl border border-pearl-gray/70 dark:border-neutral-800/70 shadow-sm p-6"
              >
                <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span class="text-2xl">📸</span>
                  Fotos ({{ uploadedPhotos().length }}/10)
                </h2>

                <div class="mb-4 space-y-3">
                  <!-- Botón principal: Agregar fotos manuales -->
                  <div class="flex flex-wrap gap-3">
                    <label
                      class="cursor-pointer bg-accent-petrol hover:bg-accent-petrol/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition inline-flex items-center gap-2"
                      [class.opacity-50]="isProcessingPhotos()"
                      [class.cursor-not-allowed]="isProcessingPhotos()"
                    >
                      <span *ngIf="!isProcessingPhotos()">➕ Agregar Fotos</span>
                      <span *ngIf="isProcessingPhotos()" class="flex items-center gap-2">
                        <svg
                          class="animate-spin h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="4"
                          ></circle>
                          <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Procesando...
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        (change)="onPhotoSelected($event)"
                        class="hidden"
                        [disabled]="isProcessingPhotos()"
                      />
                    </label>

                    <!-- Botón secundario: Generar con IA -->
                    <button
                      type="button"
                      (click)="generateAIPhotos()"
                      [disabled]="isGeneratingAIPhotos() || uploadedPhotos().length >= 10"
                      class="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition inline-flex items-center gap-2"
                      [class.opacity-50]="isGeneratingAIPhotos()"
                    >
                      <span *ngIf="!isGeneratingAIPhotos()">Generar fotos AutorentA</span>
                      <span *ngIf="isGeneratingAIPhotos()" class="flex items-center gap-2">
                        <svg
                          class="animate-spin h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="4"
                          ></circle>
                          <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Generando con IA...
                      </span>
                    </button>
                  </div>

                  <!-- Ayuda y tips -->
                  <p class="text-xs text-gray-500">
                    Mínimo 3 fotos, máximo 10. Primera foto será la portada.
                    <br />
                    <span class="text-accent-petrol dark:text-accent-warm font-medium"
                      >✨ Las fotos se procesarán automáticamente para remover el fondo</span
                    >
                    <br />
                    <span class="text-purple-600 dark:text-pink-400 font-medium"
                      >🤖 O genera fotos profesionales con IA seleccionando primero marca y
                      modelo</span
                    >
                  </p>
                </div>

                <div
                  *ngIf="uploadedPhotos().length > 0"
                  class="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                  <div *ngFor="let photo of uploadedPhotos(); let i = index" class="relative group">
                    <img
                      [src]="photo.preview"
                      [alt]="'Foto ' + (i + 1)"
                      class="w-full h-32 object-cover rounded-lg border-2"
                      [class.border-accent-petrol]="i === 0"
                      [class.border-gray-300]="i !== 0"
                    />
                    <div
                      *ngIf="i === 0"
                      class="absolute top-2 left-2 bg-accent-petrol text-white text-xs font-semibold px-2 py-1 rounded"
                    >
                      PORTADA
                    </div>
                    <button
                      type="button"
                      (click)="removePhoto(i)"
                      class="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div
                  class="mt-3 rounded-xl border border-dashed border-pearl-gray/70 dark:border-neutral-800/70 bg-gray-50/70 dark:bg-neutral-900/60 p-3 text-xs text-charcoal-medium dark:text-pearl-light/70"
                >
                  💡 Tip: combiná exteriores, interiores y tablero. La primera foto debe mostrar el
                  auto completo con buena iluminación.
                </div>

                <div
                  *ngIf="uploadedPhotos().length < 3"
                  class="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3"
                >
                  <p class="text-sm text-yellow-800">
                    ⚠️ Necesitas al menos 3 fotos para publicar. Actualmente tienes
                    {{ uploadedPhotos().length }}.
                  </p>
                </div>
              </div>

              <!-- Actions -->
              <div
                class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-200 dark:border-neutral-800/60"
              >
                <div class="text-xs text-gray-500 dark:text-pearl-light/60">
                  Al enviar, revisaremos la publicación y te avisaremos si necesitamos más
                  información.
                </div>
                <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    (click)="goBack()"
                    class="w-full sm:w-auto text-sm font-semibold text-gray-600 dark:text-pearl-light hover:text-gray-900"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    [disabled]="publishForm.invalid || isSubmitting()"
                    class="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-lg text-white font-semibold bg-primary-600 hover:bg-primary-700 dark:bg-accent-petrol dark:hover:bg-accent-petrol/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg
                      *ngIf="isSubmitting()"
                      class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span *ngIf="!isSubmitting()">{{
                      editMode() ? 'Guardar cambios' : 'Publicar Auto'
                    }}</span>
                    <span *ngIf="isSubmitting()">{{
                      editMode() ? 'Guardando...' : 'Publicando...'
                    }}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          <!-- Sidebar -->
          <aside class="lg:col-span-2 space-y-6">
            <div class="lg:sticky lg:top-6 space-y-6">
              <app-host-support-info-panel></app-host-support-info-panel>

              <section
                class="rounded-2xl border border-pearl-gray/70 dark:border-neutral-800/70 bg-white dark:bg-anthracite p-5 shadow-soft"
              >
                <h3
                  class="text-base font-semibold text-smoke-black dark:text-ivory-luminous mb-3 flex items-center gap-2"
                >
                  <span>📚</span> Obligaciones clave
                </h3>
                <ul class="space-y-3 text-sm text-charcoal-medium dark:text-pearl-light/80">
                  <li class="flex gap-3">
                    <span class="text-accent-petrol dark:text-accent-petrol/80">🛡️</span>
                    Seguro vigente que habilite alquiler a terceros.
                  </li>
                  <li class="flex gap-3">
                    <span class="text-accent-petrol dark:text-accent-petrol/80">⚙️</span>
                    Mantenimiento, VTV y documentación al día.
                  </li>
                  <li class="flex gap-3">
                    <span class="text-accent-petrol dark:text-accent-petrol/80">📄</span>
                    Cédula, DNI y pólizas listos para verificación.
                  </li>
                  <li class="flex gap-3">
                    <span class="text-accent-petrol dark:text-accent-petrol/80">⏱️</span>
                    Responder solicitudes dentro de 24 h (si no usás auto-aprobación).
                  </li>
                </ul>
                <a
                  href="/docs/anfitriones"
                  class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-accent-petrol hover:underline"
                >
                  Ver guía completa
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 7h6m0 0v6m0-6L10 16"
                    />
                  </svg>
                </a>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      :host-context(.dark) .publish-card {
        background-color: #1f2426;
        border-color: rgba(255, 255, 255, 0.08);
        color: #f7f5ee;
        transition:
          background-color 0.3s ease,
          border-color 0.3s ease;
      }

      :host-context(.dark) label,
      :host-context(.dark) .text-gray-600,
      :host-context(.dark) .text-gray-700,
      :host-context(.dark) .text-gray-900 {
        color: #f7f5ee;
      }

      :host-context(.dark) .text-gray-500 {
        color: rgba(247, 245, 238, 0.7);
      }

      :host-context(.dark) input,
      :host-context(.dark) select,
      :host-context(.dark) textarea {
        background-color: #1a1f21;
        border-color: rgba(255, 255, 255, 0.12);
        color: #f7f5ee;
      }

      :host-context(.dark) input:focus,
      :host-context(.dark) select:focus,
      :host-context(.dark) textarea:focus {
        border-color: rgba(122, 162, 170, 0.65);
        box-shadow: 0 0 0 2px rgba(44, 74, 82, 0.35);
      }

      :host-context(.dark) input::placeholder,
      :host-context(.dark) textarea::placeholder {
        color: rgba(247, 245, 238, 0.4);
      }

      :host-context(.dark) .bg-gray-100 {
        background-color: rgba(36, 42, 46, 0.9);
      }
    `,
  ],
})
export class PublishCarV2Page implements OnInit {
  private readonly fb: FormBuilder;
  private readonly carsService: CarsService;
  private readonly geocodingService: GeocodingService;
  private readonly aiPhotoEnhancer = inject(AiPhotoEnhancerService);
  private readonly supabaseClient = inject(SupabaseClientService);
  private readonly router: Router;
  private readonly route: ActivatedRoute;

  readonly minYear = 1980;
  readonly maxYear = new Date().getFullYear() + 1;

  brands = signal<CarBrand[]>([]);
  models = signal<CarModel[]>([]);
  filteredModels = signal<CarModel[]>([]);
  uploadedPhotos = signal<Array<{ file: File; preview: string }>>([]);
  isSubmitting = signal(false);
  isProcessingPhotos = signal(false);
  isGeneratingAIPhotos = signal(false);
  autofilledFromLast = signal(false);
  editMode = signal(false);
  editingCarId = signal<string | null>(null);

  // Manual coordinates (simple approach)
  manualCoordinates = signal<{ latitude: number; longitude: number } | null>(null);

  // Mercado Pago onboarding state
  mpStatus = signal<MarketplaceStatus | null>(null);
  mpCanList = signal<boolean | null>(null);
  mpStatusLoading = signal(true);
  mpReminderDismissed = signal(false);
  mpStatusError = signal<string | null>(null);

  readonly mpReady = computed(() => this.mpCanList() === true);
  readonly mpNeedsAttention = computed(() => this.mpCanList() === false);
  readonly showMpBanner = computed(
    () => !this.mpStatusLoading() && this.mpNeedsAttention() && !this.mpReminderDismissed(),
  );

  publishForm!: FormGroup;

  selectedModelInfo = computed(() => {
    const modelId = this.publishForm?.get('model_id')?.value;
    if (!modelId) return null;
    return this.filteredModels().find((m) => m.id === modelId);
  });

  generatedTitle = computed(() => {
    const brandId = this.publishForm?.get('brand_id')?.value;
    const modelId = this.publishForm?.get('model_id')?.value;
    const year = this.publishForm?.get('year')?.value;

    if (!brandId || !modelId || !year) return '';

    const brand = this.brands().find((b) => b.id === brandId);
    const model = this.models().find((m) => m.id === modelId);

    if (!brand || !model) return '';

    return `${brand.name} ${model.name} ${year}`;
  });

  isDynamicPricing(): boolean {
    return (this.publishForm?.get('pricing_strategy')?.value ?? 'dynamic') === 'dynamic';
  }

  setPricingStrategy(mode: 'dynamic' | 'custom'): void {
    this.publishForm.get('pricing_strategy')?.setValue(mode);
  }

  constructor(
    fb: FormBuilder,
    carsService: CarsService,
    geocodingService: GeocodingService,
    router: Router,
    route: ActivatedRoute,
  ) {
    this.fb = fb;
    this.carsService = carsService;
    this.geocodingService = geocodingService;
    this.router = router;
    this.route = route;
    this.modalCtrl = inject(ModalController);
    this.alertController = inject(AlertController);
    this.marketplaceService = inject(MarketplaceOnboardingService);
  }

  private readonly modalCtrl: ModalController;
  private readonly alertController: AlertController;
  private readonly marketplaceService: MarketplaceOnboardingService;
  private currentUserId: string | null = null;
  private hasPromptedOnboarding = false;

  async ngOnInit(): Promise<void> {
    this.initForm();
    void this.loadData();

    // Check if we're in edit mode
    const editCarId = this.route.snapshot.queryParamMap.get('edit');
    if (editCarId) {
      this.editMode.set(true);
      this.editingCarId.set(editCarId);
      void this.loadCarForEditing(editCarId);
    } else {
      void this.loadLastPublicationData();
    }

    // ⚠️ VERIFICAR VINCULACIÓN DE MERCADO PAGO
    await this.checkMarketplaceOnboarding();
  }

  /**
   * Verifica si el usuario tiene Mercado Pago vinculado y prepara el flujo de onboarding.
   */
  private async checkMarketplaceOnboarding(): Promise<void> {
    this.mpStatusLoading.set(true);
    try {
      const userId = await this.ensureCurrentUserId();

      if (!userId) {
        this.mpStatusError.set(
          'Necesitás iniciar sesión nuevamente para continuar con la publicación.',
        );
        this.mpCanList.set(false);
        return;
      }

      await this.refreshMarketplaceSnapshot(userId);

      if (this.mpNeedsAttention() && !this.hasPromptedOnboarding) {
        this.hasPromptedOnboarding = true;
        await this.promptMarketplaceOnboarding(userId);
      }
    } catch (error) {
      this.mpStatusError.set(
        error instanceof Error
          ? error.message
          : 'No pudimos verificar el estado de Mercado Pago. Intentá nuevamente.',
      );
    } finally {
      this.mpStatusLoading.set(false);
    }
  }

  private async ensureCurrentUserId(): Promise<string | null> {
    if (this.currentUserId) {
      return this.currentUserId;
    }

    const { data, error } = await this.supabaseClient.getClient().auth.getUser();

    if (error) {
      return null;
    }

    const user = data.user;
    if (!user) {
      return null;
    }

    this.currentUserId = user.id;
    return user.id;
  }

  private async refreshMarketplaceSnapshot(userId: string): Promise<void> {
    try {
      const [status, canList] = await Promise.all([
        this.marketplaceService.getMarketplaceStatus(userId),
        this.marketplaceService.canListCars(userId),
      ]);

      this.mpStatus.set(status);
      this.mpCanList.set(Boolean(canList));
      this.mpStatusError.set(null);

      if (Boolean(canList)) {
        this.hasPromptedOnboarding = false;
        this.mpReminderDismissed.set(false);
      }
    } catch (error) {
      this.mpStatusError.set(
        error instanceof Error
          ? error.message
          : 'No pudimos obtener el estado de tu cuenta de Mercado Pago.',
      );
      this.mpCanList.set(false);
    }
  }

  private async promptMarketplaceOnboarding(userId: string): Promise<void> {
    const completed = await this.presentOnboardingModal(userId);

    if (completed || this.mpReady()) {
      return;
    }

    await this.presentOnboardingWarning();
  }

  private async presentOnboardingModal(userId: string): Promise<boolean> {
    const modal = await this.modalCtrl.create({
      component: MpOnboardingModalComponent,
      backdropDismiss: true,
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();

    await this.refreshMarketplaceSnapshot(userId);

    return Boolean(data?.completed || this.mpReady());
  }

  private async presentOnboardingWarning(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Activá tus cobros con Mercado Pago',
      message: `<p><strong>Guardaremos la publicación como borrador hasta que vincules tu cuenta.</strong></p>
<ul>
<li>Sin split automático el dinero queda retenido en la plataforma.</li>
<li>Las reservas se marcan como pendientes hasta completar el onboarding.</li>
<li>Podés retomar el proceso desde tu perfil cuando quieras.</li>
</ul>`,
      buttons: [
        {
          text: 'Vincular ahora',
          handler: () => {
            void this.openOnboardingModal();
          },
        },
        {
          text: 'Seguir más tarde',
          role: 'cancel',
        },
      ],
    });

    await alert.present();
  }

  async openOnboardingModal(): Promise<void> {
    const userId = await this.ensureCurrentUserId();
    if (!userId) {
      alert('No pudimos identificar tu cuenta. Volvé a iniciar sesión e intentá nuevamente.');
      return;
    }

    this.hasPromptedOnboarding = true;
    const completed = await this.presentOnboardingModal(userId);

    if (!completed) {
      this.mpReminderDismissed.set(false);
    }
  }

  dismissOnboardingReminder(): void {
    this.mpReminderDismissed.set(true);
  }

  private initForm(): void {
    this.publishForm = this.fb.group({
      // Vehicle
      brand_id: ['', Validators.required],
      model_id: ['', Validators.required],
      year: [
        new Date().getFullYear(),
        [Validators.required, Validators.min(this.minYear), Validators.max(this.maxYear)],
      ],
      color: ['', Validators.required],
      mileage: [null, [Validators.required, Validators.min(0)]],
      transmission: ['', Validators.required],
      fuel: ['', Validators.required],

      // Pricing
      pricing_strategy: ['dynamic'],
      price_per_day: [null, [Validators.required, Validators.min(1)]],
      currency: ['USD', Validators.required],
      value_usd: [null, [Validators.required, Validators.min(5000), Validators.max(500000)]], // ✅ NUEVO: Valor del vehículo
      min_rental_days: [1, [Validators.required, Validators.min(1)]],
      max_rental_days: [30],
      deposit_required: [true],
      deposit_amount: [200],
      insurance_included: [false],
      auto_approval: [true], // ✅ NUEVO: Auto-aprobación por defecto activada

      // Location
      location_street: ['', Validators.required],
      location_street_number: ['', Validators.required],
      location_city: ['', Validators.required],
      location_state: ['', Validators.required],
      location_country: ['AR', Validators.required],
    });
  }

  private async loadData(): Promise<void> {
    try {
      const [brandsData, modelsData] = await Promise.all([
        this.carsService.getCarBrands(),
        this.carsService.getAllCarModels(),
      ]);

      this.brands.set(brandsData as CarBrand[]);
      this.models.set(modelsData as CarModel[]);
    } catch (error) {
      alert('Error al cargar marcas y modelos. Por favor recarga la página.');
    }
  }

  private async loadLastPublicationData(): Promise<void> {
    try {
      const lastCar = await this.carsService.getUserLastCar();

      if (lastCar) {
        // Auto-completar campos comunes que no cambian entre autos
        this.publishForm.patchValue({
          transmission: lastCar.transmission,
          fuel: lastCar.fuel,
          color: lastCar.color,
          currency: lastCar.currency,
          pricing_strategy: 'custom',
          min_rental_days: lastCar.min_rental_days,
          max_rental_days: lastCar.max_rental_days,
          deposit_required: lastCar.deposit_required,
          deposit_amount: lastCar.deposit_amount,
          insurance_included: lastCar.insurance_included,
          auto_approval: lastCar.auto_approval ?? true, // ✅ Mantener preferencia o true por defecto
          location_street: lastCar.location_street,
          location_street_number: lastCar.location_street_number,
          location_city: lastCar.location_city,
          location_state: lastCar.location_state,
          location_country: lastCar.location_country,
        });

        this.autofilledFromLast.set(true);
      }
    } catch {
      // Silently fail - not critical
    }
  }

  private async loadCarForEditing(carId: string): Promise<void> {
    try {
      const car = await this.carsService.getCarById(carId);
      if (!car) {
        alert('Auto no encontrado');
        await this.router.navigate(['/cars/my']);
        return;
      }

      // Pre-fill form with car data
      this.publishForm.patchValue({
        brand_id: car.brand_id,
        model_id: car.model_id,
        pricing_strategy: 'custom',
        year: car.year,
        color: car.color,
        mileage: car.mileage,
        transmission: car.transmission,
        fuel: car.fuel,
        price_per_day: car.price_per_day,
        currency: car.currency,
        value_usd: car.value_usd || null, // ✅ NUEVO: Cargar value_usd si existe
        min_rental_days: car.min_rental_days,
        max_rental_days: car.max_rental_days,
        deposit_required: car.deposit_required,
        deposit_amount: car.deposit_amount,
        insurance_included: car.insurance_included,
        auto_approval: car.auto_approval ?? true, // ✅ Cargar auto_approval
        location_street: car.location_street,
        location_street_number: car.location_street_number,
        location_city: car.location_city,
        location_state: car.location_state,
        location_country: car.location_country,
      });

      // Set coordinates if available
      if (car.location_lat && car.location_lng) {
        this.manualCoordinates.set({
          latitude: car.location_lat,
          longitude: car.location_lng,
        });
      }

      // Trigger brand change to load models for the selected brand
      this.onBrandChange();
    } catch (error) {
      alert('Error al cargar el auto. Por favor intenta nuevamente.');
      await this.router.navigate(['/cars/my']);
    }
  }

  onBrandChange(): void {
    const brandId = this.publishForm.get('brand_id')?.value;

    if (!brandId) {
      this.filteredModels.set([]);
    } else {
      const filtered = this.models().filter((m) => m.brand_id === brandId);
      this.filteredModels.set(filtered);
    }

    // Reset model selection when brand changes
    this.publishForm.patchValue({ model_id: '' });
  }

  onModelChange(): void {
    // Model info is displayed automatically via computed signal
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    if (this.uploadedPhotos().length + files.length > 10) {
      alert('Máximo 10 fotos permitidas');
      return;
    }

    this.isProcessingPhotos.set(true);

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} no es una imagen válida`);
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name} supera el tamaño máximo de 5MB`);
          continue;
        }

        // Usar imagen original directamente
        const processedFile = file;

        // Crear preview
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = e.target?.result as string;
          this.uploadedPhotos.update((photos) => [...photos, { file: processedFile, preview }]);
        };
        reader.readAsDataURL(processedFile);
      }
    } finally {
      this.isProcessingPhotos.set(false);
      input.value = '';
    }
  }

  removePhoto(index: number): void {
    this.uploadedPhotos.update((photos) => photos.filter((_, i) => i !== index));
  }

  /**
   * Genera fotos con IA usando stock photos + background removal
   */
  async generateAIPhotos(): Promise<void> {
    // Validar que hay marca y modelo seleccionados
    const brandId = this.publishForm.get('brand_id')?.value;
    const modelId = this.publishForm.get('model_id')?.value;

    if (!brandId || !modelId) {
      alert('Por favor selecciona primero la marca y modelo del auto');
      return;
    }

    // Obtener nombres de marca y modelo
    const brand = this.brands().find((b) => b.id === brandId);
    const model = this.models().find((m) => m.id === modelId);

    if (!brand || !model) {
      alert('Error al obtener la información del auto');
      return;
    }

    this.isGeneratingAIPhotos.set(true);

    try {
      const enhancedPhotos = await this.aiPhotoEnhancer.generateCarPhotos({
        brand: brand.name,
        model: model.name,
        year: this.publishForm.get('year')?.value,
        color: this.publishForm.get('color')?.value,
        count: 3, // Generar 3 fotos
        method: 'cloudflare-ai', // Usar Cloudflare AI en lugar de stock photos
      });

      // Agregar las fotos generadas a la lista
      for (const enhancedPhoto of enhancedPhotos) {
        const file = new File(
          [enhancedPhoto.enhanced],
          `ai-${brand.name}-${model.name}-${Date.now()}.png`,
          {
            type: 'image/png',
          },
        );

        this.uploadedPhotos.update((photos) => [
          ...photos,
          { file, preview: enhancedPhoto.preview },
        ]);
      }

      alert(
        `✅ Se generaron ${enhancedPhotos.length} fotos con IA. Puedes agregar más o reemplazarlas.`,
      );
    } catch (error) {
      alert(
        'No pudimos generar las fotos con IA. Por favor, sube tus propias fotos o intenta de nuevo.',
      );
    } finally {
      this.isGeneratingAIPhotos.set(false);
    }
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        this.manualCoordinates.set(coords);

        // Perform reverse geocoding to auto-fill address fields
        try {
          const addressResult = await this.geocodingService.reverseGeocode(
            coords.latitude,
            coords.longitude,
          );

          // Auto-fill address fields from reverse geocoding
          this.publishForm.patchValue({
            location_street: addressResult.street || '',
            location_street_number: addressResult.streetNumber || '',
            location_city: addressResult.city || '',
            location_state: addressResult.state || '',
            location_country: addressResult.countryCode || 'AR',
          });

          alert('✅ Ubicación capturada y dirección autocompletada correctamente.');
        } catch (reverseGeoError) {
          // Still keep the coordinates even if reverse geocoding fails
          alert(
            'Coordenadas capturadas, pero no se pudo obtener la dirección automáticamente. Por favor ingresa la dirección manualmente.',
          );
        }
      },
      (error) => {
        let errorMessage = 'No se pudo obtener tu ubicación. ';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage +=
              'Por favor permite el acceso a tu ubicación en la configuración del navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'La información de ubicación no está disponible en este momento.';
            break;
          case error.TIMEOUT:
            errorMessage += 'La solicitud de ubicación tardó demasiado. Intenta nuevamente.';
            break;
          default:
            errorMessage += 'Error desconocido. Por favor ingresa la dirección manualmente.';
        }

        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  canSubmit(): boolean {
    // In edit mode, allow submission without photos (car already has photos)
    // In create mode, require at least 3 photos
    if (this.editMode()) {
      return this.publishForm.valid;
    } else {
      return this.publishForm.valid && this.uploadedPhotos().length >= 3;
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.canSubmit() || this.isSubmitting()) return;

    if (!this.mpReady()) {
      await this.presentOnboardingWarning();
      this.isSubmitting.set(false);
      return;
    }

    try {
      this.isSubmitting.set(true);

      const rawValue = this.publishForm.getRawValue() as Record<string, unknown> & {
        pricing_strategy?: unknown;
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { pricing_strategy, ...formValue } = rawValue;

      // Get brand and model names for backup fields
      const brand = this.brands().find((b) => b.id === formValue.brand_id);
      const model = this.models().find((m) => m.id === formValue.model_id);
      const selectedModel = this.selectedModelInfo();

      if (!brand || !model) {
        alert('Error: Marca o modelo no encontrado');
        this.isSubmitting.set(false);
        return;
      }

      // ✅ GET COORDINATES: Manual > Geocoding > City Fallback
      let location_lat: number | undefined;
      let location_lng: number | undefined;

      // Priority 1: Use manual coordinates if user captured them
      const manualCoords = this.manualCoordinates();
      if (manualCoords) {
        location_lat = manualCoords.latitude;
        location_lng = manualCoords.longitude;
      } else {
        // Geocode if user didn't use the map
        try {
          const geocodingResult = await this.geocodingService.geocodeStructuredAddress(
            formValue.location_street as string,
            formValue.location_street_number as string,
            formValue.location_city as string,
            formValue.location_state as string,
            formValue.location_country as string,
          );

          location_lat = geocodingResult.latitude;
          location_lng = geocodingResult.longitude;
        } catch (geocodingError) {
          // Fallback: Try geocoding just the city
          try {
            const cityResult = await this.geocodingService.getCityCoordinates(
              formValue.location_city as string,
              formValue.location_country as string,
            );
            location_lat = cityResult.latitude;
            location_lng = cityResult.longitude;
          } catch (cityError) {
            alert(
              'No se pudieron obtener las coordenadas de la dirección. Por favor verifica la ubicación.',
            );
            this.isSubmitting.set(false);
            return;
          }
        }
      }

      const mpReady = this.mpReady();
      const autoApprovalRequested = (formValue.auto_approval as boolean | undefined) ?? true;
      // Si no tiene onboarding MP completado, usar 'draft' (requiere completar onboarding antes de activar)
      const targetStatus: CarStatus = mpReady ? 'active' : 'draft';
      const finalAutoApproval = mpReady ? autoApprovalRequested : false;

      const carData: Partial<Car> = {
        brand_id: formValue.brand_id as string,
        model_id: formValue.model_id as string,
        brand_text_backup: brand.name, // Campo requerido NOT NULL
        model_text_backup: model.name, // Campo requerido NOT NULL
        year: formValue.year as number,
        color: formValue.color as string,
        mileage: formValue.mileage as number,
        transmission: formValue.transmission as Transmission,
        fuel: formValue.fuel as FuelType,
        seats: selectedModel?.seats as number, // Desde car_models
        doors: selectedModel?.doors as number, // Desde car_models
        price_per_day: formValue.price_per_day as number,
        currency: formValue.currency as string,
        value_usd: formValue.value_usd as number | undefined, // ✅ NUEVO: Valor del vehículo para cálculos de riesgo
        min_rental_days: formValue.min_rental_days as number | undefined,
        max_rental_days: formValue.max_rental_days as number | undefined,
        deposit_required: formValue.deposit_required as boolean | undefined,
        deposit_amount: formValue.deposit_amount as number | undefined,
        insurance_included: formValue.insurance_included as boolean | undefined,
        auto_approval: finalAutoApproval, // ✅ Ajustado: auto-aprobación sólo si Mercado Pago está activo
        location_street: formValue.location_street as string | undefined,
        location_street_number: formValue.location_street_number as string | undefined,
        location_city: formValue.location_city as string,
        location_state: formValue.location_state as string,
        location_province: formValue.location_state as string,
        location_country: formValue.location_country as string,
        location_lat, // ✅ NEW: Geocoded coordinates
        location_lng, // ✅ NEW: Geocoded coordinates
        title: this.generatedTitle(),
        description: `${this.generatedTitle()} disponible para alquiler`,
        status: targetStatus, // ✅ Ahora respeta el estado según vinculación de Mercado Pago
        cancel_policy: 'flex',
        features: {},
      };

      let resultCar: Car;

      // Check if we're editing or creating
      if (this.editMode() && this.editingCarId()) {
        // Update existing car
        resultCar = await this.carsService.updateCar(this.editingCarId()!, carData);
      } else {
        // Create new car
        resultCar = await this.carsService.createCar(carData);
      }

      // Upload new photos (only if there are any)
      if (this.uploadedPhotos().length > 0) {
        for (let i = 0; i < this.uploadedPhotos().length; i++) {
          const photo = this.uploadedPhotos()[i];
          await this.carsService.uploadPhoto(photo.file, resultCar.id, i);
        }
      }

      if (!mpReady) {
        this.mpReminderDismissed.set(false);
      }

      const message = mpReady
        ? this.editMode()
          ? '¡Auto actualizado! Quedó activo y listo para recibir reservas.'
          : '¡Auto publicado! Revisaremos los datos y tu auto ya puede recibir reservas.'
        : this.editMode()
          ? 'Guardamos los cambios. Vinculá Mercado Pago para reactivar tu auto y recibir pagos.'
          : '¡Guardamos toda la información! Activaremos tu publicación automáticamente cuando vincules Mercado Pago.';

      alert(message);
      await this.router.navigate(['/cars/my']);
    } catch (error) {
      alert('Error al publicar el auto. Por favor intenta nuevamente.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  goBack(): void {
    void this.router.navigate(['/cars']);
  }
}
