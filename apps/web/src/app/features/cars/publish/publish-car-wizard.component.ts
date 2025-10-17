import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CarsService } from '../../../core/services/cars.service';
import { Car, CarBrand, CarModel } from '../../../core/models';

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface StepConfig {
  step: WizardStep;
  title: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-publish-car-wizard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-8 px-4">
      <div class="max-w-4xl mx-auto">
        <!-- Progress Steps -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div *ngFor="let stepConfig of stepConfigs; let i = index" class="flex items-center flex-1">
              <!-- Step Circle -->
              <div class="relative flex flex-col items-center">
                <div
                  [class.bg-blue-600]="currentStep() >= stepConfig.step"
                  [class.bg-gray-300]="currentStep() < stepConfig.step"
                  [class.text-white]="currentStep() >= stepConfig.step"
                  [class.text-gray-600]="currentStep() < stepConfig.step"
                  class="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors"
                >
                  <span *ngIf="currentStep() > stepConfig.step">✓</span>
                  <span *ngIf="currentStep() <= stepConfig.step">{{ stepConfig.step }}</span>
                </div>
                <span class="mt-2 text-xs text-center text-gray-600 hidden md:block max-w-[80px]">
                  {{ stepConfig.title }}
                </span>
              </div>

              <!-- Connector Line -->
              <div
                *ngIf="i < stepConfigs.length - 1"
                [class.bg-blue-600]="currentStep() > stepConfig.step"
                [class.bg-gray-300]="currentStep() <= stepConfig.step"
                class="flex-1 h-1 mx-2 transition-colors"
              ></div>
            </div>
          </div>
        </div>

        <!-- Current Step Card -->
        <div class="bg-white rounded-xl shadow-md p-6 md:p-8">
          <!-- Step Header -->
          <div class="mb-6">
            <div class="flex items-center gap-3 mb-2">
              <span class="text-3xl">{{ currentStepConfig().icon }}</span>
              <h2 class="text-2xl font-bold text-gray-900">{{ currentStepConfig().title }}</h2>
            </div>
            <p class="text-gray-600">{{ currentStepConfig().description }}</p>
          </div>

          <!-- Step Content -->
          <div class="space-y-6">
            <!-- Step 1: Vehicle -->
            <div *ngIf="currentStep() === 1">
              <div class="space-y-4">
                <!-- Brand -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Marca del vehículo *
                  </label>
                  <select
                    [formControl]="vehicleForm.controls.brand_id"
                    (change)="onBrandChange()"
                    class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecciona una marca</option>
                    <option *ngFor="let brand of brands()" [value]="brand.id">
                      {{ brand.name }}
                    </option>
                  </select>
                  <p *ngIf="vehicleForm.controls.brand_id.touched && vehicleForm.controls.brand_id.invalid"
                     class="mt-1 text-sm text-red-600">
                    Selecciona una marca
                  </p>
                </div>

                <!-- Model -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Modelo *
                  </label>
                  <select
                    [formControl]="vehicleForm.controls.model_id"
                    [disabled]="!vehicleForm.controls.brand_id.value"
                    class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Selecciona un modelo</option>
                    <option *ngFor="let model of filteredModels()" [value]="model.id">
                      {{ model.name }}
                    </option>
                  </select>
                  <p *ngIf="vehicleForm.controls.model_id.touched && vehicleForm.controls.model_id.invalid"
                     class="mt-1 text-sm text-red-600">
                    Selecciona un modelo
                  </p>
                </div>

                <!-- Year -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Año *
                  </label>
                  <input
                    type="number"
                    [formControl]="vehicleForm.controls.year"
                    [min]="minYear"
                    [max]="maxYear"
                    placeholder="2024"
                    class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p *ngIf="vehicleForm.controls.year.touched && vehicleForm.controls.year.invalid"
                     class="mt-1 text-sm text-red-600">
                    Ingresa un año válido ({{ minYear }}-{{ maxYear }})
                  </p>
                </div>
              </div>
            </div>

            <!-- Step 2: Specifications -->
            <div *ngIf="currentStep() === 2">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Transmission -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Transmisión *
                  </label>
                  <select
                    [formControl]="specsForm.controls.transmission"
                    class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecciona</option>
                    <option value="manual">Manual</option>
                    <option value="automatic">Automática</option>
                  </select>
                </div>

                <!-- Fuel -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Combustible *
                  </label>
                  <select
                    [formControl]="specsForm.controls.fuel"
                    class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecciona</option>
                    <option value="gasoline">Nafta</option>
                    <option value="diesel">Diesel</option>
                    <option value="electric">Eléctrico</option>
                    <option value="hybrid">Híbrido</option>
                  </select>
                </div>

                <!-- Color -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Color *
                  </label>
                  <input
                    type="text"
                    [formControl]="specsForm.controls.color"
                    placeholder="Ej: Blanco, Negro, Gris"
                    class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <!-- Mileage -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Kilometraje *
                  </label>
                  <input
                    type="number"
                    [formControl]="specsForm.controls.mileage"
                    min="0"
                    placeholder="50000"
                    class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500"
                  />
                  <p class="mt-1 text-xs text-gray-500">Kilometraje actual del vehículo</p>
                </div>
              </div>
            </div>

            <!-- Step 3: Pricing -->
            <div *ngIf="currentStep() === 3">
              <div class="space-y-6">
                <!-- Price per day -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Precio por día *
                    </label>
                    <input
                      type="number"
                      [formControl]="pricingForm.controls.price_per_day"
                      min="1"
                      placeholder="50"
                      class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500"
                    />
                    <p class="mt-1 text-xs text-gray-500">Precio diario de alquiler</p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Moneda *
                    </label>
                    <select
                      [formControl]="pricingForm.controls.currency"
                      class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="USD">USD - Dólar</option>
                      <option value="ARS">ARS - Peso Argentino</option>
                      <option value="UYU">UYU - Peso Uruguayo</option>
                    </select>
                  </div>
                </div>

                <!-- Rental days -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Mínimo de días *
                    </label>
                    <input
                      type="number"
                      [formControl]="pricingForm.controls.min_rental_days"
                      min="1"
                      placeholder="1"
                      class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Máximo de días
                    </label>
                    <input
                      type="number"
                      [formControl]="pricingForm.controls.max_rental_days"
                      min="1"
                      placeholder="30"
                      class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500"
                    />
                    <p class="mt-1 text-xs text-gray-500">Deja vacío para sin límite</p>
                  </div>
                </div>

                <!-- Deposit -->
                <div class="rounded-lg border border-gray-200 p-4 space-y-3">
                  <div class="flex items-center gap-3">
                    <input
                      type="checkbox"
                      [formControl]="pricingForm.controls.deposit_required"
                      id="deposit_required"
                      class="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label for="deposit_required" class="text-sm font-medium text-gray-700 cursor-pointer">
                      ¿Requiere depósito de garantía?
                    </label>
                  </div>

                  <div *ngIf="pricingForm.value.deposit_required">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Monto del depósito
                    </label>
                    <input
                      type="number"
                      [formControl]="pricingForm.controls.deposit_amount"
                      min="0"
                      placeholder="200"
                      class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500"
                    />
                    <p class="mt-1 text-xs text-gray-500">Monto mínimo recomendado: $200 USD</p>
                  </div>
                </div>

                <!-- Insurance -->
                <div class="flex items-center gap-3 p-4 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    [formControl]="pricingForm.controls.insurance_included"
                    id="insurance_included"
                    class="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label for="insurance_included" class="text-sm font-medium text-gray-700 cursor-pointer">
                    El seguro está incluido en el precio
                  </label>
                </div>
              </div>
            </div>

            <!-- Step 4: Location -->
            <div *ngIf="currentStep() === 4">
              <div class="space-y-4">
                <!-- Info Banner -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p class="text-sm text-blue-800">
                    📍 Indica la dirección donde el inquilino retirará el auto. Esta información será visible solo después de confirmar la reserva.
                  </p>
                </div>

                <!-- Street and Number -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Calle *
                    </label>
                    <input
                      type="text"
                      [formControl]="locationForm.controls.location_street"
                      placeholder="Ej: Av. Corrientes"
                      class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Número *
                    </label>
                    <input
                      type="text"
                      [formControl]="locationForm.controls.location_street_number"
                      placeholder="1234"
                      class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <!-- Neighborhood & Postal Code -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Barrio
                    </label>
                    <input
                      type="text"
                      [formControl]="locationForm.controls.location_neighborhood"
                      placeholder="Ej: Palermo"
                      class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Código Postal
                    </label>
                    <input
                      type="text"
                      [formControl]="locationForm.controls.location_postal_code"
                      placeholder="C1043"
                      class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <!-- City & State -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Ciudad *
                    </label>
                    <input
                      type="text"
                      [formControl]="locationForm.controls.location_city"
                      placeholder="Ej: Buenos Aires"
                      class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Provincia *
                    </label>
                    <input
                      type="text"
                      [formControl]="locationForm.controls.location_state"
                      placeholder="Ej: Buenos Aires"
                      class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <!-- Country -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    País *
                  </label>
                  <select
                    [formControl]="locationForm.controls.location_country"
                    class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="AR">Argentina</option>
                    <option value="UY">Uruguay</option>
                    <option value="BR">Brasil</option>
                    <option value="CL">Chile</option>
                    <option value="PY">Paraguay</option>
                  </select>
                </div>

                <!-- Geocoding Info -->
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p class="text-xs text-gray-600">
                    💡 La ubicación GPS se calculará automáticamente para mostrar tu auto en el mapa de búsqueda.
                  </p>
                </div>
              </div>
            </div>

            <!-- Step 5: Photos -->
            <div *ngIf="currentStep() === 5">
              <div class="space-y-6">
                <!-- Info Banner -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p class="text-sm text-blue-800">
                    📸 Sube mínimo 3 fotos (máximo 10). La primera foto será la portada. Fotos de calidad atraen más inquilinos.
                  </p>
                </div>

                <!-- Upload Button -->
                <div class="flex justify-center">
                  <label class="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition flex items-center gap-2">
                    <span>➕ Agregar Fotos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      (change)="onPhotoSelected($event)"
                      class="hidden"
                    />
                  </label>
                </div>

                <!-- Photos Grid -->
                <div *ngIf="uploadedPhotos().length > 0" class="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div
                    *ngFor="let photo of uploadedPhotos(); let i = index"
                    class="relative group rounded-lg overflow-hidden border-2"
                    [class.border-blue-500]="i === 0"
                    [class.border-gray-300]="i !== 0"
                  >
                    <!-- Photo Preview -->
                    <img
                      [src]="photo.preview"
                      [alt]="'Foto ' + (i + 1)"
                      class="w-full h-48 object-cover"
                    />

                    <!-- Cover Badge -->
                    <div
                      *ngIf="i === 0"
                      class="absolute top-2 left-2 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded"
                    >
                      PORTADA
                    </div>

                    <!-- Controls Overlay -->
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center gap-2">
                      <!-- Move Up -->
                      <button
                        *ngIf="i > 0"
                        (click)="movePhotoUp(i)"
                        class="opacity-0 group-hover:opacity-100 bg-white text-gray-800 px-3 py-2 rounded transition hover:bg-gray-100"
                        title="Mover arriba"
                      >
                        ↑
                      </button>

                      <!-- Remove -->
                      <button
                        (click)="removePhoto(i)"
                        class="opacity-0 group-hover:opacity-100 bg-red-600 text-white px-3 py-2 rounded transition hover:bg-red-700"
                        title="Eliminar"
                      >
                        🗑️
                      </button>

                      <!-- Move Down -->
                      <button
                        *ngIf="i < uploadedPhotos().length - 1"
                        (click)="movePhotoDown(i)"
                        class="opacity-0 group-hover:opacity-100 bg-white text-gray-800 px-3 py-2 rounded transition hover:bg-gray-100"
                        title="Mover abajo"
                      >
                        ↓
                      </button>
                    </div>

                    <!-- Position Number -->
                    <div class="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs font-semibold px-2 py-1 rounded">
                      {{ i + 1 }}/{{ uploadedPhotos().length }}
                    </div>
                  </div>
                </div>

                <!-- Validation Message -->
                <div
                  *ngIf="uploadedPhotos().length < 3"
                  class="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                >
                  <p class="text-sm text-yellow-800">
                    ⚠️ Necesitas al menos 3 fotos para continuar. Actualmente tienes {{ uploadedPhotos().length }}.
                  </p>
                </div>

                <!-- Tips -->
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p class="text-xs font-semibold text-gray-700 mb-2">💡 Consejos para mejores fotos:</p>
                  <ul class="text-xs text-gray-600 space-y-1 list-disc list-inside">
                    <li>Usa buena iluminación natural</li>
                    <li>Muestra el exterior completo, interior, asientos, tablero y baúl</li>
                    <li>Limpia el auto antes de fotografiar</li>
                    <li>Evita fotos borrosas o con objetos personales</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Step 6: Documents -->
            <div *ngIf="currentStep() === 6">
              <div class="space-y-6">
                <!-- Info Banner -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p class="text-sm text-blue-800">
                    📄 Sube los documentos del vehículo. La cédula verde es obligatoria. Los demás ayudan a dar confianza.
                  </p>
                </div>

                <!-- Document: Registration (Required) -->
                <div class="border-2 rounded-lg p-4" [class.border-blue-500]="hasDocument('registration')" [class.border-gray-300]="!hasDocument('registration')">
                  <div class="flex items-start justify-between mb-3">
                    <div>
                      <h3 class="font-semibold text-gray-900 flex items-center gap-2">
                        Cédula Verde / Título de Propiedad
                        <span class="text-red-500">*</span>
                      </h3>
                      <p class="text-xs text-gray-600 mt-1">Documento que acredita la titularidad del vehículo</p>
                    </div>
                    <span *ngIf="hasDocument('registration')" class="text-green-600 font-semibold">✓</span>
                  </div>

                  <div *ngIf="!hasDocument('registration')">
                    <label class="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition inline-block text-sm">
                      Subir Cédula Verde
                      <input type="file" accept="image/*,application/pdf" (change)="onDocumentSelected($event, 'registration')" class="hidden" />
                    </label>
                  </div>

                  <div *ngIf="hasDocument('registration')" class="flex items-center gap-3">
                    <img *ngIf="getDocumentPreview('registration') !== 'pdf-icon'" [src]="getDocumentPreview('registration')" alt="Cédula Verde" class="w-20 h-20 object-cover rounded border" />
                    <div *ngIf="getDocumentPreview('registration') === 'pdf-icon'" class="w-20 h-20 bg-gray-200 rounded border flex items-center justify-center text-gray-600 text-2xl">
                      📄
                    </div>
                    <button (click)="removeDocument('registration')" class="text-red-600 hover:text-red-700 text-sm underline">
                      Eliminar
                    </button>
                  </div>
                </div>

                <!-- Document: Insurance (Optional) -->
                <div class="border border-gray-300 rounded-lg p-4">
                  <div class="flex items-start justify-between mb-3">
                    <div>
                      <h3 class="font-semibold text-gray-900">Póliza de Seguro</h3>
                      <p class="text-xs text-gray-600 mt-1">Comprobante de seguro vigente (opcional)</p>
                    </div>
                    <span *ngIf="hasDocument('insurance')" class="text-green-600 font-semibold">✓</span>
                  </div>

                  <div *ngIf="!hasDocument('insurance')">
                    <label class="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg transition inline-block text-sm">
                      Subir Seguro
                      <input type="file" accept="image/*,application/pdf" (change)="onDocumentSelected($event, 'insurance')" class="hidden" />
                    </label>
                  </div>

                  <div *ngIf="hasDocument('insurance')" class="flex items-center gap-3">
                    <img *ngIf="getDocumentPreview('insurance') !== 'pdf-icon'" [src]="getDocumentPreview('insurance')" alt="Seguro" class="w-20 h-20 object-cover rounded border" />
                    <div *ngIf="getDocumentPreview('insurance') === 'pdf-icon'" class="w-20 h-20 bg-gray-200 rounded border flex items-center justify-center text-gray-600 text-2xl">
                      📄
                    </div>
                    <button (click)="removeDocument('insurance')" class="text-red-600 hover:text-red-700 text-sm underline">
                      Eliminar
                    </button>
                  </div>
                </div>

                <!-- Document: Technical Inspection (Optional) -->
                <div class="border border-gray-300 rounded-lg p-4">
                  <div class="flex items-start justify-between mb-3">
                    <div>
                      <h3 class="font-semibold text-gray-900">Revisión Técnica (VTV)</h3>
                      <p class="text-xs text-gray-600 mt-1">Comprobante de verificación técnica vigente (opcional)</p>
                    </div>
                    <span *ngIf="hasDocument('technical_inspection')" class="text-green-600 font-semibold">✓</span>
                  </div>

                  <div *ngIf="!hasDocument('technical_inspection')">
                    <label class="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg transition inline-block text-sm">
                      Subir VTV
                      <input type="file" accept="image/*,application/pdf" (change)="onDocumentSelected($event, 'technical_inspection')" class="hidden" />
                    </label>
                  </div>

                  <div *ngIf="hasDocument('technical_inspection')" class="flex items-center gap-3">
                    <img *ngIf="getDocumentPreview('technical_inspection') !== 'pdf-icon'" [src]="getDocumentPreview('technical_inspection')" alt="VTV" class="w-20 h-20 object-cover rounded border" />
                    <div *ngIf="getDocumentPreview('technical_inspection') === 'pdf-icon'" class="w-20 h-20 bg-gray-200 rounded border flex items-center justify-center text-gray-600 text-2xl">
                      📄
                    </div>
                    <button (click)="removeDocument('technical_inspection')" class="text-red-600 hover:text-red-700 text-sm underline">
                      Eliminar
                    </button>
                  </div>
                </div>

                <!-- Validation Message -->
                <div *ngIf="!hasDocument('registration')" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p class="text-sm text-yellow-800">
                    ⚠️ La cédula verde es obligatoria para continuar.
                  </p>
                </div>

                <!-- Info -->
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p class="text-xs font-semibold text-gray-700 mb-2">💡 Acerca de los documentos:</p>
                  <ul class="text-xs text-gray-600 space-y-1 list-disc list-inside">
                    <li>Puedes subir imágenes (JPG, PNG) o archivos PDF</li>
                    <li>Tamaño máximo: 10MB por archivo</li>
                    <li>Los documentos serán verificados por nuestro equipo</li>
                    <li>Tus datos personales estarán protegidos</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Step 7: Review -->
            <div *ngIf="currentStep() === 7">
              <div class="space-y-6">
                <!-- Success Banner -->
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p class="text-sm text-green-800">
                    ✅ ¡Casi listo! Revisa que toda la información sea correcta antes de enviar.
                  </p>
                </div>

                <!-- Vehicle Info -->
                <div class="bg-white border border-gray-200 rounded-lg p-5">
                  <h3 class="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    🚗 Vehículo
                    <button (click)="currentStep.set(1)" class="ml-auto text-sm text-blue-600 hover:underline">Editar</button>
                  </h3>
                  <dl class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt class="text-gray-600">Marca:</dt>
                      <dd class="font-semibold">{{ selectedBrandName() }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-600">Modelo:</dt>
                      <dd class="font-semibold">{{ selectedModelName() }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-600">Año:</dt>
                      <dd class="font-semibold">{{ vehicleForm.value.year }}</dd>
                    </div>
                  </dl>
                </div>

                <!-- Specs Info -->
                <div class="bg-white border border-gray-200 rounded-lg p-5">
                  <h3 class="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    ⚙️ Especificaciones
                    <button (click)="currentStep.set(2)" class="ml-auto text-sm text-blue-600 hover:underline">Editar</button>
                  </h3>
                  <dl class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt class="text-gray-600">Transmisión:</dt>
                      <dd class="font-semibold capitalize">{{ specsForm.value.transmission }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-600">Combustible:</dt>
                      <dd class="font-semibold capitalize">{{ specsForm.value.fuel }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-600">Color:</dt>
                      <dd class="font-semibold">{{ specsForm.value.color }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-600">Kilometraje:</dt>
                      <dd class="font-semibold">{{ specsForm.value.mileage | number }} km</dd>
                    </div>
                  </dl>
                </div>

                <!-- Pricing Info -->
                <div class="bg-white border border-gray-200 rounded-lg p-5">
                  <h3 class="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    💵 Precio y Condiciones
                    <button (click)="currentStep.set(3)" class="ml-auto text-sm text-blue-600 hover:underline">Editar</button>
                  </h3>
                  <dl class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt class="text-gray-600">Precio por día:</dt>
                      <dd class="font-semibold">{{ pricingForm.value.currency }} ${{ pricingForm.value.price_per_day }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-600">Días mínimos:</dt>
                      <dd class="font-semibold">{{ pricingForm.value.min_rental_days }} día(s)</dd>
                    </div>
                    <div>
                      <dt class="text-gray-600">Depósito:</dt>
                      <dd class="font-semibold">{{ pricingForm.value.deposit_required ? ('$' + pricingForm.value.deposit_amount) : 'No requerido' }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-600">Seguro incluido:</dt>
                      <dd class="font-semibold">{{ pricingForm.value.insurance_included ? 'Sí' : 'No' }}</dd>
                    </div>
                  </dl>
                </div>

                <!-- Location Info -->
                <div class="bg-white border border-gray-200 rounded-lg p-5">
                  <h3 class="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    📍 Ubicación
                    <button (click)="currentStep.set(4)" class="ml-auto text-sm text-blue-600 hover:underline">Editar</button>
                  </h3>
                  <p class="text-sm text-gray-800">
                    {{ locationForm.value.location_street }} {{ locationForm.value.location_street_number }}<br>
                    <span *ngIf="locationForm.value.location_neighborhood">{{ locationForm.value.location_neighborhood }}, </span>
                    {{ locationForm.value.location_city }}, {{ locationForm.value.location_state }}<br>
                    <span *ngIf="locationForm.value.location_postal_code">CP: {{ locationForm.value.location_postal_code }}</span>
                  </p>
                </div>

                <!-- Photos Info -->
                <div class="bg-white border border-gray-200 rounded-lg p-5">
                  <h3 class="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    📸 Fotos ({{ uploadedPhotos().length }})
                    <button (click)="currentStep.set(5)" class="ml-auto text-sm text-blue-600 hover:underline">Editar</button>
                  </h3>
                  <div class="grid grid-cols-4 gap-2">
                    <div *ngFor="let photo of uploadedPhotos().slice(0, 4); let i = index" class="relative">
                      <img [src]="photo.preview" [alt]="'Foto ' + (i + 1)" class="w-full h-20 object-cover rounded border" />
                      <div *ngIf="i === 0" class="absolute top-1 left-1 bg-blue-600 text-white text-xs px-1 rounded">
                        PORTADA
                      </div>
                    </div>
                  </div>
                  <p *ngIf="uploadedPhotos().length > 4" class="text-xs text-gray-600 mt-2">
                    + {{ uploadedPhotos().length - 4 }} foto(s) más
                  </p>
                </div>

                <!-- Documents Info -->
                <div class="bg-white border border-gray-200 rounded-lg p-5">
                  <h3 class="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    📄 Documentos
                    <button (click)="currentStep.set(6)" class="ml-auto text-sm text-blue-600 hover:underline">Editar</button>
                  </h3>
                  <ul class="space-y-2 text-sm">
                    <li class="flex items-center gap-2">
                      <span class="text-green-600">✓</span>
                      <span>Cédula Verde</span>
                    </li>
                    <li *ngIf="hasDocument('insurance')" class="flex items-center gap-2">
                      <span class="text-green-600">✓</span>
                      <span>Seguro</span>
                    </li>
                    <li *ngIf="hasDocument('technical_inspection')" class="flex items-center gap-2">
                      <span class="text-green-600">✓</span>
                      <span>Revisión Técnica</span>
                    </li>
                  </ul>
                </div>

                <!-- Terms & Conditions -->
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <label class="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" class="mt-1 w-5 h-5 text-blue-600 rounded" />
                    <span class="text-sm text-gray-800">
                      Acepto los <a href="/terms" target="_blank" class="text-blue-600 underline">términos y condiciones</a> y confirmo que la información proporcionada es verídica. Entiendo que mi anuncio será revisado por el equipo de AutoRentA antes de publicarse.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div class="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              *ngIf="currentStep() > 1"
              (click)="previousStep()"
              class="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              ← Anterior
            </button>
            <div *ngIf="currentStep() === 1" class="w-32"></div>

            <button
              (click)="nextStep()"
              [disabled]="!canProceed()"
              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {{ currentStep() === 7 ? 'Enviar para revisión' : 'Siguiente →' }}
            </button>
          </div>
        </div>

        <!-- Auto-generated Title Preview -->
        <div *ngIf="generatedTitle()" class="mt-4 p-4 bg-blue-50 rounded-lg">
          <p class="text-sm text-gray-600">Título del anuncio (generado automáticamente):</p>
          <p class="text-lg font-semibold text-gray-900">{{ generatedTitle() }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class PublishCarWizardComponent {
  private readonly fb: FormBuilder;
  private readonly carsService: CarsService;
  private readonly router: Router;

  // Constants
  readonly minYear = 1980;
  readonly maxYear = new Date().getFullYear() + 1;

  // State
  currentStep = signal<WizardStep>(1);
  brands = signal<CarBrand[]>([]);
  models = signal<CarModel[]>([]);
  uploadedPhotos = signal<Array<{ file: File; preview: string }>>([]);
  isUploadingPhoto = signal(false);
  uploadedDocuments = signal<Map<string, { file: File; preview: string }>>(new Map());
  isSubmitting = signal(false);
  isLoadingData = signal(true);

  // Forms (initialized in constructor)
  vehicleForm: ReturnType<FormBuilder['group']>;
  specsForm: ReturnType<FormBuilder['group']>;
  pricingForm: ReturnType<FormBuilder['group']>;
  locationForm: ReturnType<FormBuilder['group']>;

  readonly stepConfigs: StepConfig[] = [
    { step: 1, title: 'Vehículo', icon: '🚗', description: 'Marca, modelo y año del vehículo' },
    { step: 2, title: 'Especificaciones', icon: '⚙️', description: 'Transmisión, combustible, color y kilometraje' },
    { step: 3, title: 'Precio', icon: '💵', description: 'Precio por día y condiciones de alquiler' },
    { step: 4, title: 'Ubicación', icon: '📍', description: 'Dirección donde se retira el auto' },
    { step: 5, title: 'Fotos', icon: '📸', description: 'Imágenes del vehículo' },
    { step: 6, title: 'Documentos', icon: '📄', description: 'Cédula verde, seguro y papeles' },
    { step: 7, title: 'Revisión', icon: '✅', description: 'Revisar y enviar para aprobación' },
  ];

  // Computed
  currentStepConfig = computed(() => {
    return this.stepConfigs.find(s => s.step === this.currentStep()) || this.stepConfigs[0];
  });

  filteredModels = computed(() => {
    const brandId = this.vehicleForm.value.brand_id;
    if (!brandId) return [];
    return this.models().filter(m => m.brand_id === brandId);
  });

  generatedTitle = computed(() => {
    const brandId = this.vehicleForm.value.brand_id;
    const modelId = this.vehicleForm.value.model_id;
    const year = this.vehicleForm.value.year;

    if (!brandId || !modelId || !year) return '';

    const brand = this.brands().find(b => b.id === brandId);
    const model = this.models().find(m => m.id === modelId);

    if (!brand || !model) return '';

    return `${brand.name} ${model.name} ${year}`;
  });

  selectedBrandName = computed(() => {
    const brandId = this.vehicleForm.value.brand_id;
    return this.brands().find(b => b.id === brandId)?.name || '';
  });

  selectedModelName = computed(() => {
    const modelId = this.vehicleForm.value.model_id;
    return this.models().find(m => m.id === modelId)?.name || '';
  });

  constructor(
    fb: FormBuilder,
    carsService: CarsService,
    router: Router,
  ) {
    this.fb = fb;
    this.carsService = carsService;
    this.router = router;

    // Initialize forms after dependencies are set
    this.vehicleForm = this.fb.group({
      brand_id: ['', Validators.required],
      model_id: ['', Validators.required],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(this.minYear), Validators.max(this.maxYear)]],
    });

    this.specsForm = this.fb.group({
      transmission: ['', Validators.required],
      fuel: ['', Validators.required],
      color: ['', Validators.required],
      mileage: [null, [Validators.required, Validators.min(0)]],
    });

    this.pricingForm = this.fb.group({
      price_per_day: [null, [Validators.required, Validators.min(1)]],
      currency: ['USD', Validators.required],
      deposit_required: [true],
      deposit_amount: [200],
      insurance_included: [false],
      min_rental_days: [1, [Validators.required, Validators.min(1)]],
      max_rental_days: [30, Validators.min(1)],
    });

    this.locationForm = this.fb.group({
      location_street: ['', Validators.required],
      location_street_number: ['', Validators.required],
      location_neighborhood: [''],
      location_city: ['', Validators.required],
      location_state: ['', Validators.required],
      location_postal_code: [''],
      location_country: ['AR', Validators.required],
      location_formatted_address: [''],
      location_lat: [null],
      location_lng: [null],
    });

    void this.loadBrandsAndModels();
  }

  async loadBrandsAndModels(): Promise<void> {
    try {
      this.isLoadingData.set(true);

      // Load all brands
      const brandsData = await this.carsService.getCarBrands();
      this.brands.set(brandsData as CarBrand[]);

      // Load all models (we'll filter by brand_id in the UI)
      const modelsData = await this.carsService.getAllCarModels();
      this.models.set(modelsData as CarModel[]);
    } catch (error) {
      console.error('Error loading brands/models:', error);
      alert('Error al cargar marcas y modelos. Por favor recarga la página.');
    } finally {
      this.isLoadingData.set(false);
    }
  }

  onBrandChange(): void {
    // Reset model when brand changes
    this.vehicleForm.patchValue({ model_id: '' });
  }

  canProceed(): boolean {
    switch (this.currentStep()) {
      case 1:
        return this.vehicleForm.valid;
      case 2:
        return this.specsForm.valid;
      case 3:
        return this.pricingForm.valid;
      case 4:
        return this.locationForm.valid;
      case 5:
        return this.uploadedPhotos().length >= 3; // Minimum 3 photos required
      case 6:
        // At least registration document required
        return this.uploadedDocuments().has('registration');
      default:
        return true;
    }
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    // Validate: max 10 photos
    if (this.uploadedPhotos().length + files.length > 10) {
      alert('Máximo 10 fotos permitidas');
      return;
    }

    // Process each file
    Array.from(files).forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} no es una imagen válida`);
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} supera el tamaño máximo de 5MB`);
        return;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        this.uploadedPhotos.update((photos) => [...photos, { file, preview }]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    input.value = '';
  }

  removePhoto(index: number): void {
    this.uploadedPhotos.update((photos) => photos.filter((_, i) => i !== index));
  }

  movePhotoUp(index: number): void {
    if (index === 0) return;
    this.uploadedPhotos.update((photos) => {
      const newPhotos = [...photos];
      [newPhotos[index - 1], newPhotos[index]] = [newPhotos[index], newPhotos[index - 1]];
      return newPhotos;
    });
  }

  movePhotoDown(index: number): void {
    if (index === this.uploadedPhotos().length - 1) return;
    this.uploadedPhotos.update((photos) => {
      const newPhotos = [...photos];
      [newPhotos[index], newPhotos[index + 1]] = [newPhotos[index + 1], newPhotos[index]];
      return newPhotos;
    });
  }

  onDocumentSelected(event: Event, documentType: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate file type (image or PDF)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Solo se permiten imágenes (JPG, PNG) o PDF');
      return;
    }

    // Validate file size (10MB max for documents)
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo supera el tamaño máximo de 10MB');
      return;
    }

    // Create preview
    if (file.type === 'application/pdf') {
      // For PDF, use a generic icon preview
      this.uploadedDocuments.update((docs) => {
        const newDocs = new Map(docs);
        newDocs.set(documentType, { file, preview: 'pdf-icon' });
        return newDocs;
      });
    } else {
      // For images, create data URL preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        this.uploadedDocuments.update((docs) => {
          const newDocs = new Map(docs);
          newDocs.set(documentType, { file, preview });
          return newDocs;
        });
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    input.value = '';
  }

  removeDocument(documentType: string): void {
    this.uploadedDocuments.update((docs) => {
      const newDocs = new Map(docs);
      newDocs.delete(documentType);
      return newDocs;
    });
  }

  hasDocument(documentType: string): boolean {
    return this.uploadedDocuments().has(documentType);
  }

  getDocumentPreview(documentType: string): string {
    return this.uploadedDocuments().get(documentType)?.preview || '';
  }

  nextStep(): void {
    if (!this.canProceed()) return;

    if (this.currentStep() < 7) {
      this.currentStep.set((this.currentStep() + 1) as WizardStep);
    } else {
      void this.submitForm();
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set((this.currentStep() - 1) as WizardStep);
    }
  }

  async submitForm(): Promise<void> {
    if (this.isSubmitting()) return; // Prevent double submission

    try {
      this.isSubmitting.set(true);

      // Step 1: Create the car with all form data
      const carData: Partial<Car> = {
        // Vehicle info
        brand_id: this.vehicleForm.value.brand_id,
        model_id: this.vehicleForm.value.model_id,
        year: this.vehicleForm.value.year,
        title: this.generatedTitle(), // Auto-generated title

        // Specs
        transmission: this.specsForm.value.transmission,
        fuel: this.specsForm.value.fuel,
        color: this.specsForm.value.color,
        mileage: this.specsForm.value.mileage,

        // Pricing
        price_per_day: this.pricingForm.value.price_per_day,
        currency: this.pricingForm.value.currency,
        deposit_required: this.pricingForm.value.deposit_required,
        deposit_amount: this.pricingForm.value.deposit_amount,
        insurance_included: this.pricingForm.value.insurance_included,
        min_rental_days: this.pricingForm.value.min_rental_days,
        max_rental_days: this.pricingForm.value.max_rental_days,

        // Location
        location_street: this.locationForm.value.location_street,
        location_street_number: this.locationForm.value.location_street_number,
        location_neighborhood: this.locationForm.value.location_neighborhood,
        location_city: this.locationForm.value.location_city,
        location_state: this.locationForm.value.location_state,
        location_province: this.locationForm.value.location_state, // Alias
        location_country: this.locationForm.value.location_country,
        location_postal_code: this.locationForm.value.location_postal_code,

        // Status
        status: 'draft', // Will need admin approval
        cancel_policy: 'flexible', // Default policy
        features: {}, // Empty for now
        description: `${this.generatedTitle()} disponible para alquiler`, // Auto-generated
      };

      const createdCar = await this.carsService.createCar(carData);

      // Step 2: Upload photos
      if (this.uploadedPhotos().length > 0) {
        for (let i = 0; i < this.uploadedPhotos().length; i++) {
          const photo = this.uploadedPhotos()[i];
          await this.carsService.uploadPhoto(photo.file, createdCar.id, i);
        }
      }

      // Step 3: Upload documents (TODO: Need to implement document upload in CarsService)
      // For now, we'll skip this and add it later
      const docsToUpload = Array.from(this.uploadedDocuments().entries());
      if (docsToUpload.length > 0) {
        console.log('Documents to upload:', docsToUpload.length);
        // TODO: Implement document upload
        // await this.carsService.uploadVehicleDocument(file, carId, documentType);
      }

      // Step 4: Navigate to success page or my cars
      alert('¡Auto publicado exitosamente! Será revisado por nuestro equipo.');
      await this.router.navigate(['/cars/my-cars']);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error al publicar el auto. Por favor intenta nuevamente.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
