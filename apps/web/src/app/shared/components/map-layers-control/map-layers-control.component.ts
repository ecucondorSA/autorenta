import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

export interface MapLayer {
  id: string;
  label: string;
  visible: boolean;
  icon?: string;
}

@Component({
  selector: 'app-map-layers-control',
  standalone: true,
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="map-layers-control">
      @for (layer of layers; track layer.id) {
        <button
          type="button"
          class="layer-btn"
          [class.active]="layer.visible"
          (click)="toggleLayer(layer)"
        >
          @if (layer.icon) {
            <ion-icon [name]="layer.icon"></ion-icon>
          }
          {{ layer.label }}
        </button>
      }
    </div>
  `,
  styles: [`
    .map-layers-control {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.5rem;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .layer-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: transparent;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .layer-btn:hover {
      background: #f5f5f5;
    }

    .layer-btn.active {
      background: var(--ion-color-primary);
      color: white;
      border-color: var(--ion-color-primary);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapLayersControlComponent {
  @Input() layers: MapLayer[] = [];
  @Output() layerToggle = new EventEmitter<MapLayer>();

  toggleLayer(layer: MapLayer): void {
    layer.visible = !layer.visible;
    this.layerToggle.emit(layer);
  }
}
