import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';

// Import model-viewer for side effects (registers the custom element)
import '@google/model-viewer';

@Component({
  selector: 'app-ar-preview',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Allow model-viewer custom element
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-[60] bg-black/95 flex flex-col">
      <!-- Header -->
      <header
        class="flex items-center justify-between p-4 pt-safe-top bg-black/80 backdrop-blur-xl border-b border-white/10"
      >
        <div class="flex items-center gap-3">
          <span class="text-brand-primary text-2xl">🔮</span>
          <div>
            <h2 class="text-lg font-bold text-white">Vista AR</h2>
            <p class="text-xs text-white/60">{{ carTitle || 'Vehículo' }}</p>
          </div>
        </div>
        <button
          (click)="previewClosed.emit()"
          class="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </header>

      <!-- 3D Model Viewer -->
      <div class="flex-1 relative">
        <model-viewer
          [attr.src]="modelUrl"
          [attr.poster]="posterUrl"
          alt="Vista 3D del vehículo"
          shadow-intensity="1"
          camera-controls
          touch-action="pan-y"
          auto-rotate
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-scale="auto"
          environment-image="neutral"
          exposure="0.8"
          class="w-full h-full"
          style="--poster-color: transparent;"
        >
          <!-- AR Button (auto-shown on supported devices) -->
          <button
            slot="ar-button"
            class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-brand-primary text-black font-black px-8 py-4 rounded-2xl shadow-neon-glow flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              />
            </svg>
            Ver en AR
          </button>

          <!-- Loading indicator -->
          <div slot="progress-bar" class="absolute bottom-0 inset-x-0 h-1 bg-white/10">
            <div class="h-full bg-brand-primary animate-pulse"></div>
          </div>
        </model-viewer>

        <!-- Floating Controls -->
        <div class="absolute bottom-24 right-4 flex flex-col gap-2">
          <button
            class="p-3 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-white/80 hover:text-white hover:bg-black/80 transition-all"
            title="Rotar automáticamente"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            class="p-3 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-white/80 hover:text-white hover:bg-black/80 transition-all"
            title="Restablecer vista"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Info Footer -->
      <footer class="p-4 pb-safe-bottom bg-black/80 backdrop-blur-xl border-t border-white/10">
        <div class="flex items-center justify-between">
          <div class="text-white/60 text-sm">
            <span class="text-brand-primary">💡</span>
            Arrastra para rotar • Pellizca para zoom
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-white/40">Powered by</span>
            <span class="text-xs font-bold text-brand-primary">WebXR</span>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [
    `
      model-viewer {
        width: 100%;
        height: 100%;
        background: linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%);
      }

      model-viewer::part(default-ar-button) {
        display: none; /* Hide default AR button, we use custom */
      }
    `,
  ],
})
export class ARPreviewComponent {
  @Input() carTitle = '';
  @Input() modelUrl = ''; // Set via input when 3D model is available
  @Input() posterUrl = '/assets/images/car-placeholder.svg';

  @Output() previewClosed = new EventEmitter<void>();
}
