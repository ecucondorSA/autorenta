import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular';

export interface MapControlsEvent {
  type: 'center' | 'search-area' | 'fullscreen' | '3d-toggle';
  data?: any;
}

@Component({
  selector: 'app-map-controls',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="map-controls-container">
      <!-- Location & View Controls -->
      <div class="control-group location-controls">
        <button class="control-btn" (click)="onCenter()" title="Centrar en mi ubicación">
          <ion-icon name="locate"></ion-icon>
        </button>
        <button
          class="control-btn"
          (click)="on3DToggle()"
          [class.active]="is3DEnabled()"
          title="Vista 3D"
        >
          <ion-icon name="cube-outline"></ion-icon>
        </button>
        <button class="control-btn" (click)="onFullscreen()" title="Pantalla completa">
          <ion-icon name="expand-outline"></ion-icon>
        </button>
      </div>

      <!-- Search This Area -->
      <div class="control-group search-area-control">
        <button class="control-btn search-area-btn" (click)="onSearchArea()">
          <ion-icon name="search-outline"></ion-icon>
          <span>Buscar en esta área</span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .map-controls-container {
        position: absolute;
        top: 1rem;
        right: 1rem;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        pointer-events: none;
      }

      .control-group {
        display: flex;
        flex-direction: column;
        gap: 2px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        overflow: hidden;
        pointer-events: auto;
      }

      .location-controls {
        gap: 0;
      }

      .control-btn {
        background: white;
        border: none;
        padding: 0.75rem;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 40px;
        min-height: 40px;
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

          ion-icon {
            color: white;
          }
        }

        ion-icon {
          font-size: 1.25rem;
          color: #374151;
        }

        &:not(:last-child) {
          border-bottom: 1px solid #e5e7eb;
        }
      }

      .search-area-btn {
        flex-direction: row;
        gap: 0.5rem;
        padding: 0.75rem 1.25rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: white;
        background: #3b82f6;

        &:hover {
          background: #2563eb;
        }

        &:active {
          background: #1d4ed8;
        }

        ion-icon {
          color: white;
        }

        span {
          color: white;
        }
      }

      /* Mobile */
      @media (max-width: 768px) {
        .map-controls-container {
          top: 0.5rem;
          right: 0.5rem;
          gap: 0.5rem;
        }

        .control-btn {
          padding: 0.625rem;
          min-width: 36px;
          min-height: 36px;

          ion-icon {
            font-size: 1.125rem;
          }
        }

        .search-area-btn {
          font-size: 0.8125rem;
          padding: 0.625rem 1rem;
        }
      }
    `,
  ],
})
export class MapControlsComponent {
  @Output() controlEvent = new EventEmitter<MapControlsEvent>();

  is3DEnabled = signal(false);

  onCenter() {
    this.controlEvent.emit({ type: 'center' });
  }

  on3DToggle() {
    this.is3DEnabled.update((v) => !v);
    this.controlEvent.emit({ type: '3d-toggle', data: this.is3DEnabled() });
  }

  onFullscreen() {
    this.controlEvent.emit({ type: 'fullscreen' });
  }

  onSearchArea() {
    this.controlEvent.emit({ type: 'search-area' });
  }
}
