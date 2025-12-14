
import {Component, EventEmitter, Output, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { IonicModule } from '@ionic/angular';

export interface MapControlsEvent {
  type: 'center' | 'search-area' | 'fullscreen' | '3d-toggle';
  data?: unknown;
}

@Component({
  selector: 'app-map-controls',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule],
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
        align-items: flex-end; /* Prevent stretching */
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
        color: var(--text-secondary, #4b5563);

        &:hover {
          background: var(--surface-hover-light, #f9fafb);
          color: var(--text-primary, #111827);
        }

        &:active {
          background: var(--surface-active-light, #f3f4f6);
        }

        &.active {
          background: var(--surface-info-light, #eff6ff);
          color: var(--system-blue-default, #2563eb);

          ion-icon {
            color: var(--system-blue-default, #2563eb);
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
          background-color: var(--border-light, #f3f4f6);
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
