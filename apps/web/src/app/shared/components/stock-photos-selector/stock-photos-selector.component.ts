import {Component, Input, Output, EventEmitter, signal, inject, OnInit,
  ChangeDetectionStrategy} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { StockPhotosService, StockPhoto } from '../../../core/services/stock-photos.service';
import { NotificationManagerService } from '../../../core/services/notification-manager.service';

@Component({
  selector: 'app-stock-photos-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="stock-photos-selector">
      <!-- Search Form -->
      <div class="mb-4 space-y-3">
        <div class="flex gap-2">
          <input
            type="text"
            [(ngModel)]="brand"
            placeholder="Marca (ej: Toyota)"
            class="flex-1 px-3 py-2 border border-border-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-cta-default"
          />
          <input
            type="text"
            [(ngModel)]="model"
            placeholder="Modelo (ej: Corolla)"
            class="flex-1 px-3 py-2 border border-border-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-cta-default"
          />
          <input
            type="number"
            [(ngModel)]="year"
            placeholder="Año"
            class="w-24 px-3 py-2 border border-border-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-cta-default"
          />
        </div>

        @if (searching()) {
          <!-- Loading state -->
          <div class="flex items-center justify-center gap-2 py-3 text-cta-default">
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
            <span class="font-medium">Buscando fotos de {{ brand }} {{ model }}...</span>
          </div>
        } @else {
          <!-- Search button (only show if not auto-loaded) -->
          @if (!searched()) {
            <button
              type="button"
              (click)="searchPhotos()"
              [disabled]="!canSearch()"
              class="w-full px-4 py-2 bg-cta-default text-cta-text rounded-lg hover:bg-cta-default disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔍 Buscar Fotos de Stock
            </button>
          } @else {
            <!-- Re-search button -->
            <button
              type="button"
              (click)="searchPhotos()"
              [disabled]="!canSearch()"
              class="w-full px-4 py-2 bg-surface-raised text-text-primary border border-border-muted rounded-lg hover:bg-surface-base disabled:opacity-50"
            >
              🔄 Buscar nuevamente
            </button>
          }
        }
      </div>

      <!-- Results Grid -->
      @if (photos().length > 0) {
        <div class="grid grid-cols-3 gap-3 mb-4">
          @for (photo of photos(); track photo.id) {
            <div
              class="relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all"
              [class.border-cta-default]="selectedPhotos().has(photo.id)"
              [class.border-border-default]="!selectedPhotos().has(photo.id)"
              (click)="togglePhoto(photo)"
            >
              <img
                [src]="photo.url"
                [alt]="photo.photographer"
                class="w-full h-24 object-cover"
                loading="lazy"
              />
              @if (selectedPhotos().has(photo.id)) {
                <div class="absolute inset-0 bg-cta-default/20 flex items-center justify-center">
                  <svg class="h-8 w-8 text-cta-default" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              }
              <div
                class="absolute bottom-0 left-0 right-0 bg-surface-overlay/50 text-text-inverse text-xs p-1 truncate"
              >
                {{ photo.photographer }}
              </div>
            </div>
          }
        </div>

        <button
          type="button"
          (click)="downloadSelected()"
          [disabled]="selectedPhotos().size === 0 || downloading()"
          class="w-full px-4 py-2 bg-success-light text-text-primary rounded-lg hover:bg-success-light disabled:opacity-50"
        >
          @if (downloading()) {
            Descargando {{ selectedPhotos().size }} foto(s)...
          } @else {
            📥 Descargar {{ selectedPhotos().size }} foto(s) seleccionada(s)
          }
        </button>
      } @else if (searched() && !searching()) {
        <div class="text-center py-8 text-text-secondary">
          <p>No se encontraron fotos para esta búsqueda.</p>
          <p class="text-sm mt-2">Intenta con otros términos o sube fotos manualmente.</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .stock-photos-selector {
        max-width: 100%;
      }
    `,
  ],
})
export class StockPhotosSelectorComponent implements OnInit {
  @Input() brand = '';
  @Input() model = '';
  @Input() year?: number;
  @Output() photosSelected = new EventEmitter<File[]>();

  private readonly stockPhotosService = inject(StockPhotosService);
  private readonly toastService = inject(NotificationManagerService);

  readonly photos = signal<StockPhoto[]>([]);
  readonly selectedPhotos = signal<Set<string>>(new Set());
  readonly searching = signal(false);
  readonly downloading = signal(false);
  readonly searched = signal(false);

  /**
   * ✅ Auto-search photos when component initializes with brand/model
   */
  ngOnInit(): void {
    // If brand and model are provided, automatically search for photos
    if (this.canSearch()) {
      console.log(`🔍 Auto-searching stock photos for ${this.brand} ${this.model}`);
      this.searchPhotos();
    }
  }

  canSearch(): boolean {
    return !!(this.brand && this.model);
  }

  async searchPhotos(): Promise<void> {
    if (!this.canSearch()) {
      this.toastService.error('Error', 'Por favor ingresa marca y modelo');
      return;
    }

    this.searching.set(true);
    this.searched.set(true);
    this.selectedPhotos.set(new Set());

    try {
      const results = await this.stockPhotosService.searchCarPhotos({
        brand: this.brand,
        model: this.model,
        year: this.year,
      });

      this.photos.set(results);

      if (results.length === 0) {
        this.toastService.info('Info', 'No se encontraron fotos. Intenta con otros términos.');
      }
    } catch (error) {
      console.error('Error searching stock photos:', error);
      this.toastService.error('Error', 'Error al buscar fotos. Verifica tu conexión.');
    } finally {
      this.searching.set(false);
    }
  }

  togglePhoto(photo: StockPhoto): void {
    const selected = new Set(this.selectedPhotos());
    if (selected.has(photo.id)) {
      selected.delete(photo.id);
    } else {
      selected.add(photo.id);
    }
    this.selectedPhotos.set(selected);
  }

  async downloadSelected(): Promise<void> {
    const selectedIds = Array.from(this.selectedPhotos());
    if (selectedIds.length === 0) return;

    this.downloading.set(true);

    try {
      const selectedPhotos = this.photos().filter((p) => selectedIds.includes(p.id));
      const files: File[] = [];

      for (const photo of selectedPhotos) {
        try {
          const file = await this.stockPhotosService.downloadPhoto(photo);
          files.push(file);
          await this.stockPhotosService.trackDownload(photo.id);
        } catch (error) {
          console.error(`Error downloading photo ${photo.id}:`, error);
        }
      }

      if (files.length > 0) {
        this.photosSelected.emit(files);
        this.toastService.success('Éxito', `✅ ${files.length} foto(s) descargada(s) exitosamente`);
        this.selectedPhotos.set(new Set());
      } else {
        this.toastService.error('Error', 'No se pudieron descargar las fotos');
      }
    } catch (error) {
      console.error('Error downloading photos:', error);
      this.toastService.error('Error', 'Error al descargar fotos');
    } finally {
      this.downloading.set(false);
    }
  }
}
