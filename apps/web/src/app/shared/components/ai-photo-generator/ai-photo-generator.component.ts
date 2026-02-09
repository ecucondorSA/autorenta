import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AiPhotoEnhancerService, EnhancedPhoto } from '@core/services/ai/ai-photo-enhancer.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';

@Component({
  selector: 'app-ai-photo-generator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="ai-photo-generator bg-surface-base">
      <!-- Minimalist Header -->
      <div class="text-center mb-8">
        <div
          class="w-16 h-16 bg-gradient-to-tr from-cta-default to-cta-hover rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-emerald-200"
        >
          <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-slate-900">Estudio Creativo IA</h2>
        <p class="text-sm text-slate-500 mt-1">
          Generando visuales para tu {{ brand }} {{ model }}
        </p>
      </div>

      <!-- Compact Specs Display (Non-editable for minimalism if inputs exist) -->
      <div
        class="bg-slate-50 rounded-xl p-4 mb-8 flex justify-between items-center border border-slate-100"
      >
        <div class="flex flex-col">
          <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider"
            >Vehículo</span
          >
          <span class="text-sm font-bold text-slate-700">{{ brand }} {{ model }}</span>
        </div>
        <div class="flex flex-col text-right">
          <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider"
            >Detalles</span
          >
          <span class="text-sm font-medium text-slate-600"
            >{{ year || 'S/A' }} · {{ color || 'Color base' }}</span
          >
        </div>
      </div>

      <!-- Main Action -->
      <button
        type="button"
        (click)="generatePhotos()"
        [disabled]="generating() || !canGenerate()"
        class="w-full py-5 rounded-2xl text-white font-black text-lg shadow-xl hover:shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:transform-none transition-all flex items-center justify-center gap-3 bg-gradient-to-r from-cta-default to-cta-hover"
      >
        @if (generating()) {
          <svg class="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
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
          <span class="tracking-tight">DISEÑANDO...</span>
        } @else {
          <span class="tracking-tight">✨ GENERAR IMÁGENES</span>
        }
      </button>

      <p class="text-[10px] text-center text-slate-400 mt-4 uppercase tracking-widest font-medium">
        Powered by Gemini Pro Vision & Cloudflare
      </p>

      <!-- Results Preview -->
      @if (generatedPhotos().length > 0) {
        <div class="mt-10 animate-fade-in">
          <div class="grid grid-cols-2 gap-4 mb-6">
            @for (photo of generatedPhotos(); track photo.preview) {
              <div class="aspect-[4/3] rounded-2xl overflow-hidden shadow-md border border-white">
                <img [src]="photo.preview" alt="IA Result" class="w-full h-full object-cover" />
              </div>
            }
          </div>

          <button
            type="button"
            (click)="useGeneratedPhotos()"
            class="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            AGREGAR A LA PUBLICACIÓN
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .animate-fade-in {
        animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class AiPhotoGeneratorComponent {
  @Input() brand = '';
  @Input() model = '';
  @Input() year?: number;
  @Input() color?: string;
  @Output() photosGenerated = new EventEmitter<File[]>();

  private readonly aiPhotoService = inject(AiPhotoEnhancerService);
  private readonly toastService = inject(NotificationManagerService);

  readonly count = signal(3);
  readonly generating = signal(false);
  readonly generatedPhotos = signal<EnhancedPhoto[]>([]);

  canGenerate(): boolean {
    return !!(this.brand && this.model);
  }

  async generatePhotos(): Promise<void> {
    if (!this.canGenerate()) {
      this.toastService.error('Información insuficiente', 'Falta marca o modelo');
      return;
    }

    this.generating.set(true);
    this.generatedPhotos.set([]);

    try {
      const photos = await this.aiPhotoService.generateCarPhotos({
        brand: this.brand,
        model: this.model,
        year: this.year,
        color: this.color,
        count: this.count(),
        method: 'cloudflare-ai', // Force AI method
      });

      this.generatedPhotos.set(photos);

      if (photos.length === 0) {
        this.toastService.info('Intenta nuevamente', 'No se generaron resultados');
      }
    } catch (error) {
      console.error('Error generating photos:', error);
      this.toastService.error('Error de red', 'No se pudo conectar con el estudio');
    } finally {
      this.generating.set(false);
    }
  }

  useGeneratedPhotos(): void {
    const photos = this.generatedPhotos();
    if (photos.length === 0) return;

    const files = photos.map((photo) => photo.original);
    this.photosGenerated.emit(files);

    this.aiPhotoService.cleanupPreviews(photos);
    this.generatedPhotos.set([]);
    this.toastService.success('Estudio Creativo', 'Fotos añadidas');
  }
}
