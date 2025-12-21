import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input, Output,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import {
  AiPhotoEnhancerService,
  EnhancedPhoto,
  GenerationMethod,
} from '@core/services/ai/ai-photo-enhancer.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';

@Component({
  selector: 'app-ai-photo-generator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="ai-photo-generator">
      <!-- Method Selector -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-text-primary mb-2"
          >Método de generación:</label
        >
        <div class="flex gap-2">
          <button
            type="button"
            (click)="method.set('stock-photos')"
            [class]="
              method() === 'stock-photos'
                ? 'bg-cta-default text-cta-text'
                : 'bg-surface-hover text-text-primary'
            "
            class="flex-1 px-4 py-2 rounded-lg transition-colors"
          >
            📸 Stock Photos (Rápido)
          </button>
          <button
            type="button"
            (click)="method.set('cloudflare-ai')"
            [class]="
              method() === 'cloudflare-ai'
                ? 'bg-cta-default text-cta-text'
                : 'bg-surface-hover text-text-primary'
            "
            class="flex-1 px-4 py-2 rounded-lg transition-colors"
          >
            ⚡ Gemini 2.5 Flash
          </button>
        </div>
        <p class="text-xs text-text-secondary mt-2">
          @if (method() === 'stock-photos') {
            Busca fotos reales de autos similares (más rápido, fotos reales)
          } @else {
            Genera fotos con Gemini 2.5 Flash (mejor calidad)
          }
        </p>
      </div>

      <!-- Input Form -->
      <div class="mb-4 space-y-3">
        <div class="grid grid-cols-2 gap-2">
          <input
            type="text"
            [(ngModel)]="brand"
            placeholder="Marca"
            class="px-3 py-2 border border-border-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-cta-default"
          />
          <input
            type="text"
            [(ngModel)]="model"
            placeholder="Modelo"
            class="px-3 py-2 border border-border-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-cta-default"
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <input
            type="number"
            [(ngModel)]="year"
            placeholder="Año (opcional)"
            class="px-3 py-2 border border-border-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-cta-default"
          />
          <input
            type="text"
            [(ngModel)]="color"
            placeholder="Color (opcional)"
            class="px-3 py-2 border border-border-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-cta-default"
          />
        </div>
        <input
          type="number"
          [(ngModel)]="count"
          placeholder="Cantidad de fotos (1-5)"
          min="1"
          max="5"
          class="w-full px-3 py-2 border border-border-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-cta-default"
        />
      </div>

      <!-- Generate Button -->
      <button
        type="button"
        (click)="generatePhotos()"
        [disabled]="generating() || !canGenerate()"
        class="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-text-inverse rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
      >
        @if (generating()) {
          <span class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
            @if (method() === 'cloudflare-ai') {
              Generando con IA (esto puede tardar 5-20 segundos)...
            } @else {
              Buscando fotos de stock...
            }
          </span>
        } @else {
          ✨ Generar Fotos con IA
        }
      </button>

      <!-- Generated Photos Preview -->
      @if (generatedPhotos().length > 0) {
        <div class="mt-6">
          <h3 class="text-sm font-semibold text-text-primary mb-3">
            Fotos generadas ({{ generatedPhotos().length }}):
          </h3>
          <div class="grid grid-cols-2 gap-3 mb-4">
            @for (photo of generatedPhotos(); track photo.preview) {
              <div class="relative group">
                <img
                  [src]="photo.preview"
                  alt="Foto generada"
                  class="w-full h-32 object-cover rounded-lg border-2 border-border-default"
                />
                <div
                  class="absolute top-2 right-2 bg-surface-overlay/70 text-text-inverse text-xs px-2 py-1 rounded"
                >
                  {{ photo.source === 'cloudflare-ai' ? '🤖 IA' : '📸 Stock' }}
                </div>
              </div>
            }
          </div>
          <button
            type="button"
            (click)="useGeneratedPhotos()"
            class="w-full px-4 py-2 bg-success-light text-text-primary rounded-lg hover:bg-success-light"
          >
            ✅ Usar estas fotos ({{ generatedPhotos().length }})
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .ai-photo-generator {
        max-width: 100%;
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

  readonly method = signal<GenerationMethod>('stock-photos');
  readonly count = signal(3);
  readonly generating = signal(false);
  readonly generatedPhotos = signal<EnhancedPhoto[]>([]);

  canGenerate(): boolean {
    return !!(this.brand && this.model);
  }

  async generatePhotos(): Promise<void> {
    if (!this.canGenerate()) {
      this.toastService.error('Por favor ingresa marca y modelo', '');
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
        method: this.method(),
      });

      this.generatedPhotos.set(photos);

      if (photos.length === 0) {
        this.toastService.info('No se pudieron generar fotos. Intenta con otros parámetros.', '');
      } else {
        this.toastService.success(`✅ ${photos.length} foto(s) generada(s) exitosamente`, '');
      }
    } catch (error) {
      console.error('Error generating photos:', error);
      this.toastService.error('Error al generar fotos. Intenta nuevamente.', '');
    } finally {
      this.generating.set(false);
    }
  }

  useGeneratedPhotos(): void {
    const photos = this.generatedPhotos();
    if (photos.length === 0) return;

    // Convert EnhancedPhoto to File[]
    const files = photos.map((photo) => photo.original);
    this.photosGenerated.emit(files);

    // Cleanup previews
    this.aiPhotoService.cleanupPreviews(photos);
    this.generatedPhotos.set([]);
    this.toastService.success('Fotos agregadas al formulario', '');
  }
}
