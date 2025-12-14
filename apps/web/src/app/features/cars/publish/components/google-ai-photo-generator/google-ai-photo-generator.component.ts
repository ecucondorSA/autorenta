
import {Component, EventEmitter, Input, OnInit, Output, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PricingService } from '@core/services/pricing.service';
import { PublishCarPhotoService } from '@features/cars/publish/services/publish-car-photo.service';
import { FipeAutocompleteComponent } from '@shared/components/fipe-autocomplete/fipe-autocomplete.component';

@Component({
  selector: 'app-google-ai-photo-generator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FipeAutocompleteComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        (click)="requestClose.emit()">
      </div>
    
      <!-- Modal Card -->
      <div class="relative w-full max-w-lg bg-white dark:bg-[#161821] rounded-3xl shadow-2xl overflow-hidden transform transition-all border border-slate-100 dark:border-neutral-800">
    
        <!-- Header de Autorentar -->
        <div class="relative px-8 pt-8 pb-4 bg-slate-900 text-white">
    
          <button
            (click)="requestClose.emit()"
            class="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full hover:bg-slate-700 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
    
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-xl bg-[#00D95F]/10 flex items-center justify-center text-[#00D95F]">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-[#00D95F]">Estudio IA</h2>
          </div>
          <p class="text-gray-400 text-sm">
            Describe tu auto y deja que Google Imagen genere fotos profesionales para tu publicación.
          </p>
        </div>
    
        <!-- Formulario -->
        <!-- Formulario y Contenido Dinámico -->
        <div class="p-8 pt-2 space-y-6">
          <form [formGroup]="form" (ngSubmit)="generate()">
    
            <!-- VISTA 1: RESUMEN INTELIGENTE (Si ya tenemos datos) -->
            @if (hasInitialData && !isEditing()) {
              <div class="animate-fadeIn">
                <div class="bg-slate-50 dark:bg-neutral-800/50 rounded-2xl p-5 border border-slate-100 dark:border-neutral-800 mb-6">
                  <div class="flex items-start justify-between">
                    <div>
                      <p class="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Vehículo detectado</p>
                      <h3 class="text-2xl font-black text-slate-900 dark:text-white">
                        {{ form.get('brand')?.value }} {{ form.get('model')?.value }}
                      </h3>
                      <div class="flex items-center gap-2 mt-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {{ form.get('year')?.value }}
                        </span>
                        <button type="button" (click)="isEditing.set(true)" class="text-sm font-semibold text-emerald-600 hover:text-emerald-500 hover:underline">
                          Cambiar datos
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <!-- Solo pedimos el color para confirmar o ajustar -->
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Color del vehículo</label>
                  <input type="text" formControlName="color" placeholder="Ej: Blanco Perla" class="w-full bg-slate-50 dark:bg-neutral-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400 font-medium">
                  <p class="text-xs text-slate-500 mt-2">El color ayuda a la IA a generar reflejos realistas.</p>
                </div>
              </div>
            }
    
            <!-- VISTA 2: FORMULARIO COMPLETO (Modo edición o sin datos) -->
            @if (isEditing() || !hasInitialData) {
              <div class="space-y-4 animate-fadeIn">
                @if (hasInitialData) {
                  <div class="flex justify-between items-center mb-2">
                    <h3 class="font-bold text-slate-900 dark:text-white">Editar detalles</h3>
                    <button type="button" (click)="isEditing.set(false)" class="text-xs font-bold text-slate-500 hover:text-slate-800">Cancelar</button>
                  </div>
                }
                <!-- Marca -->
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Marca</label>
                  <app-fipe-autocomplete
                    [placeholder]="'Ej: Toyota, Ford...'"
                    [options]="fipeBrands()"
                    [isLoading]="isLoadingFIPEBrands()"
                    [selectedValue]="{code: selectedBrandCode || '', name: form.get('brand')?.value || ''}"
                    (optionSelected)="onBrandSelected($event)"
                  ></app-fipe-autocomplete>
                </div>
                <!-- Modelo -->
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Modelo</label>
                  <app-fipe-autocomplete
                    [placeholder]="'Ej: Corolla, Ranger...'"
                    [options]="fipeModels()"
                    [isLoading]="isLoadingFIPEModels()"
                    [disabled]="!selectedBrandCode"
                    [selectedValue]="{code: '', name: form.get('model')?.value || ''}"
                    (optionSelected)="onModelSelected($event)"
                  ></app-fipe-autocomplete>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <!-- Año -->
                  <div>
                    <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Año</label>
                    <select formControlName="year" class="w-full bg-slate-50 dark:bg-neutral-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all font-medium">
                      <option [ngValue]="null" disabled>Seleccionar</option>
                      @for (year of yearOptions; track year) {
                        <option [ngValue]="year">{{ year }}</option>
                      }
                    </select>
                  </div>
                  <!-- Color (En form completo) -->
                  <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Color</label>
                    <input type="text" formControlName="color" placeholder="Ej: Blanco Perla" class="w-full bg-slate-50 dark:bg-neutral-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400">
                  </div>
                </div>
              </div>
            }
    
            <!-- Botón de Generación -->
            <div class="mt-8">
              <button
                type="submit"
                [disabled]="form.invalid || photoService.isGeneratingAIPhotos()"
                class="w-full relative group overflow-hidden bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]">
    
                <span class="relative z-10 flex items-center justify-center gap-2">
                  @if (photoService.isGeneratingAIPhotos()) {
                    <span class="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></span>
                  }
                  @if (!photoService.isGeneratingAIPhotos()) {
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                  {{ photoService.isGeneratingAIPhotos() ? 'Creando magia...' : 'Generar Fotos' }}
                </span>
    
                <!-- Shine Effect -->
                <div class="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0"></div>
              </button>
              <p class="text-center text-xs text-slate-400 mt-3">Powered by Google Imagen</p>
            </div>
    
          </form>
        </div>
      </div>
    </div>
    `,
  styles: [`
    @keyframes shimmer {
      100% { transform: translateX(100%); }
    }
  `]
})
export class GoogleAiPhotoGeneratorComponent implements OnInit {
  @Input() currentBrand: string | null = null;
  @Input() currentModel: string | null = null;
  @Input() currentYear: number | null = null;
  @Input() currentColor: string | null = null;

  @Output() requestClose = new EventEmitter<void>();
  @Output() generatedData = new EventEmitter<{ brand: string, model: string, year: number, color: string }>();

  photoService = inject(PublishCarPhotoService);
  private pricingService = inject(PricingService); // Para obtener marcas/modelos
  private fb = inject(FormBuilder);

  // FIPE Data
  fipeBrands = signal<{ code: string, name: string }[]>([]);
  fipeModels = signal<{ code: string, name: string }[]>([]);
  isLoadingFIPEBrands = signal(false);
  isLoadingFIPEModels = signal(false);
  selectedBrandCode: string | null = null;

  isEditing = signal(false);

  get hasInitialData(): boolean {
    return !!(this.currentBrand && this.currentModel);
  }

  yearOptions = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);

  form = this.fb.group({
    brand: ['', Validators.required],
    model: ['', Validators.required],
    year: [new Date().getFullYear(), Validators.required],
    color: ['Blanco', Validators.required]
  });

  constructor() {
    this.loadBrands();
  }

  ngOnInit(): void {
    if (this.currentBrand) this.form.patchValue({ brand: this.currentBrand });
    if (this.currentModel) this.form.patchValue({ model: this.currentModel });
    if (this.currentYear) this.form.patchValue({ year: this.currentYear });
    if (this.currentColor) this.form.patchValue({ color: this.currentColor });

    // Si no hay datos iniciales, forzar modo edición
    if (!this.hasInitialData) {
      this.isEditing.set(true);
    }
  }

  async loadBrands() {
    this.isLoadingFIPEBrands.set(true);
    try {
      const brands = await this.pricingService.getFipeBrands();
      this.fipeBrands.set(brands.map(b => ({ code: b.code, name: b.name })));
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoadingFIPEBrands.set(false);
    }
  }

  async onBrandSelected(brand: { code: string, name: string } | null) {
    if (!brand) return;
    this.form.patchValue({ brand: brand.name });
    this.selectedBrandCode = brand.code;

    this.isLoadingFIPEModels.set(true);
    this.fipeModels.set([]); // Reset models
    try {
      const models = await this.pricingService.getFipeModels(brand.code);
      this.fipeModels.set(models.map(m => ({ code: m.code, name: m.name })));
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoadingFIPEModels.set(false);
    }
  }

  onModelSelected(model: { code: string, name: string } | null) {
    if (model) {
      this.form.patchValue({ model: model.name });
    }
  }

  async generate() {
    if (this.form.invalid) return;

    const { brand, model, year, color } = this.form.value;

    await this.photoService.generateAIPhotos(brand!, model!, +year!);

    // Cerrar modal si fue exitoso (el servicio maneja errores/alertas)
    if (!this.photoService.isGeneratingAIPhotos()) {
      this.generatedData.emit({
        brand: brand!,
        model: model!,
        year: +year!, // Ensure prompt number
        color: color!
      });
      this.requestClose.emit();
    }
  }
}
