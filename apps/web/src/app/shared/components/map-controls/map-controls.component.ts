import { Component, Output, EventEmitter, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MapControlsEvent {
  type: 'zoom-in' | 'zoom-out' | 'center' | 'layer-toggle' | 'search-area' | 'fullscreen';
  data?: any;
}

export interface MapLayer {
  id: string;
  name: string;
  icon: string;
  active: boolean;
}

@Component({
  selector: 'app-map-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-controls-container">
      <!-- Zoom Controls -->
      <div class="control-group">
        <button
          (click)="onZoomIn()"
          class="control-button"
          title="Acercar"
          aria-label="Acercar mapa"
        >
          <span class="icon">+</span>
        </button>
        <button
          (click)="onZoomOut()"
          class="control-button"
          title="Alejar"
          aria-label="Alejar mapa"
        >
          <span class="icon">−</span>
        </button>
      </div>

      <!-- Center & Location -->
      <div class="control-group">
        <button
          (click)="onCenter()"
          class="control-button"
          title="Centrar en mi ubicación"
          aria-label="Centrar mapa en mi ubicación"
        >
          <span class="icon">📍</span>
        </button>
      </div>

      <!-- Layer Toggle -->
      @if (showLayerToggle) {
        <div class="control-group">
          <button
            (click)="toggleLayersMenu()"
            class="control-button"
            [class.active]="showLayers()"
            title="Capas del mapa"
            aria-label="Mostrar capas del mapa"
          >
            <span class="icon">🗺️</span>
          </button>

          @if (showLayers()) {
            <div class="layers-menu">
              @for (layer of layers; track layer.id) {
                <button
                  (click)="onLayerToggle(layer)"
                  class="layer-item"
                  [class.active]="layer.active"
                >
                  <span class="layer-icon">{{ layer.icon }}</span>
                  <span class="layer-name">{{ layer.name }}</span>
                  <span class="layer-checkbox">{{ layer.active ? '✓' : '' }}</span>
                </button>
              }
            </div>
          }
        </div>
      }

      <!-- Search This Area -->
      @if (showSearchArea) {
        <div class="control-group">
          <button
            (click)="onSearchArea()"
            class="control-button search-area-btn"
            title="Buscar en esta área"
            aria-label="Buscar autos en el área visible del mapa"
          >
            <span class="icon">🔍</span>
            <span class="text">Buscar aquí</span>
          </button>
        </div>
      }

      <!-- Fullscreen -->
      @if (showFullscreen) {
        <div class="control-group">
          <button
            (click)="onFullscreen()"
            class="control-button"
            [title]="isFullscreen() ? 'Salir de pantalla completa' : 'Pantalla completa'"
            [aria-label]="isFullscreen() ? 'Salir de pantalla completa' : 'Ver mapa en pantalla completa'"
          >
            <span class="icon">{{ isFullscreen() ? '↙' : '⤢' }}</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .map-controls-container {
      position: absolute;
      top: 1rem;
      right: 1rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      position: relative;
    }

    .control-button {
      background: white;
      border: none;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;

      &:hover {
        background: #f3f4f6;
      }

      &:active {
        background: #e5e7eb;
      }

      &.active {
        background: #3b82f6;
        color: white;
      }

      .icon {
        font-size: 1.25rem;
        line-height: 1;
      }
    }

    .search-area-btn {
      width: auto;
      padding: 0 1rem;
      gap: 0.5rem;

      .text {
        font-size: 0.875rem;
        font-weight: 600;
        white-space: nowrap;
      }
    }

    .layers-menu {
      position: absolute;
      top: 0;
      right: calc(100% + 0.5rem);
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      min-width: 180px;
      overflow: hidden;
    }

    .layer-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border: none;
      background: white;
      width: 100%;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: #f3f4f6;
      }

      &.active {
        background: #eff6ff;

        .layer-name {
          font-weight: 600;
          color: #3b82f6;
        }
      }

      .layer-icon {
        font-size: 1.25rem;
      }

      .layer-name {
        flex: 1;
        font-size: 0.875rem;
        color: #374151;
        text-align: left;
      }

      .layer-checkbox {
        color: #3b82f6;
        font-weight: 700;
        font-size: 1.125rem;
      }
    }

    /* Mobile optimizations */
    @media (max-width: 768px) {
      .map-controls-container {
        top: 0.5rem;
        right: 0.5rem;
      }

      .control-button {
        width: 36px;
        height: 36px;

        .icon {
          font-size: 1.125rem;
        }
      }

      .search-area-btn {
        .text {
          font-size: 0.8125rem;
        }
      }

      .layers-menu {
        min-width: 160px;
      }

      .layer-item {
        padding: 0.625rem 0.75rem;
      }
    }
  `]
})
export class MapControlsComponent {
  @Input() showLayerToggle = true;
  @Input() showSearchArea = true;
  @Input() showFullscreen = true;
  @Input() layers: MapLayer[] = [
    { id: 'traffic', name: 'Tráfico', icon: '🚦', active: false },
    { id: 'transit', name: 'Transporte público', icon: '🚌', active: false },
    { id: 'satellite', name: 'Satélite', icon: '🛰️', active: false },
  ];

  @Output() controlEvent = new EventEmitter<MapControlsEvent>();

  showLayers = signal(false);
  isFullscreen = signal(false);

  onZoomIn() {
    this.controlEvent.emit({ type: 'zoom-in' });
  }

  onZoomOut() {
    this.controlEvent.emit({ type: 'zoom-out' });
  }

  onCenter() {
    this.controlEvent.emit({ type: 'center' });
  }

  toggleLayersMenu() {
    this.showLayers.update(v => !v);
  }

  onLayerToggle(layer: MapLayer) {
    layer.active = !layer.active;
    this.controlEvent.emit({ type: 'layer-toggle', data: layer });
  }

  onSearchArea() {
    this.controlEvent.emit({ type: 'search-area' });
  }

  onFullscreen() {
    this.isFullscreen.update(v => !v);
    this.controlEvent.emit({ type: 'fullscreen', data: this.isFullscreen() });
  }
}
