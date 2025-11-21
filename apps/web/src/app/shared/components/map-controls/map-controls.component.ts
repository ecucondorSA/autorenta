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
        top: 1.5rem;
        right: 1.5rem;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        pointer-events: none;
      }

      .control-group {
        display: flex;
        flex-direction: column;
        background: white;
        border-radius: 12px;
        box-shadow:
          0 4px 6px -1px rgba(0, 0, 0, 0.1),
          0 2px 4px -1px rgba(0, 0, 0, 0.06),
          0 0 0 1px rgba(0, 0, 0, 0.05);
        overflow: hidden;
        pointer-events: auto;
      }

      .location-controls {
        gap: 0;
      }

      .control-btn {
        background: white;
        border: none;
        padding: 0;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        position: relative;
        color: #4b5563;

        &:hover {
          background: #f9fafb;
          color: #111827;
        }

        &:active {
          background: #f3f4f6;
        }

        &.active {
          background: #eff6ff;
          color: #2563eb;

          ion-icon {
            color: #2563eb;
          }
        }

        ion-icon {
          font-size: 1.25rem;
          transition: transform 0.2s;
        }

        &:hover ion-icon {
          transform: scale(1.1);
        }

        &:not(:last-child)::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 8px;
          right: 8px;
          height: 1px;
          background-color: #f3f4f6;
        }
      }

      .search-area-control {
        align-items: center;
        background: transparent;
        box-shadow: none;
        border-radius: 0;
        overflow: visible;
      }

      .search-area-btn {
        flex-direction: row;
        gap: 0.5rem;
        padding: 0 1.25rem;
        height: 40px;
        width: auto;
        font-size: 0.875rem;
        font-weight: 600;
        color: white;
        background: #2563eb;
        border-radius: 9999px;
        box-shadow:
          0 4px 6px -1px rgba(37, 99, 235, 0.3),
          0 2px 4px -1px rgba(37, 99, 235, 0.15);

        &:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow:
            0 6px 8px -1px rgba(37, 99, 235, 0.4),
            0 3px 6px -1px rgba(37, 99, 235, 0.2);
        }

        &:active {
          background: #1e40af;
          transform: translateY(0);
        }

        ion-icon {
          color: white;
          font-size: 1.125rem;
        }

        span {
          color: white;
          white-space: nowrap;
        }

        &::after {
          display: none;
        }
      }

      /* Mobile */
      @media (max-width: 768px) {
        .map-controls-container {
          top: 1rem;
          right: 1rem;
          gap: 0.75rem;
        }

        .control-btn {
          width: 40px;
          height: 40px;

          ion-icon {
            font-size: 1.125rem;
          }
        }

        .search-area-btn {
          height: 36px;
          padding: 0 1rem;
          font-size: 0.8125rem;
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
