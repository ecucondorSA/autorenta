import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  imports: [CommonModule],
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





