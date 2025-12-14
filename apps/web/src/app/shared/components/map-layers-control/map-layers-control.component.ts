import {Component, Input, Output, EventEmitter, signal,
  ChangeDetectionStrategy} from '@angular/core';


export interface MapLayer {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
  enabled: boolean;
}

@Component({
  selector: 'app-map-layers-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './map-layers-control.component.html',
  styleUrls: ['./map-layers-control.component.css'],
})
export class MapLayersControlComponent {
  @Input() layers: MapLayer[] = [];
  @Output() readonly layerToggle = new EventEmitter<{ layerId: string; visible: boolean }>();

  readonly isOpen = signal(false);

  toggleLayer(layerId: string, visible: boolean): void {
    this.layerToggle.emit({ layerId, visible });
  }

  togglePanel(): void {
    this.isOpen.set(!this.isOpen());
  }
}
