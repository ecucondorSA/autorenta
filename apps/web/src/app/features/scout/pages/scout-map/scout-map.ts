import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LiveTrackingMapComponent } from '@shared/components/live-tracking-map/live-tracking-map.component';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { locateOutline, scanOutline, alertCircle, closeOutline } from 'ionicons/icons';
import { BountyMapItem } from '@core/models/bounty.model';

@Component({
  selector: 'app-scout-map',
  standalone: true,
  imports: [CommonModule, LiveTrackingMapComponent, RouterLink, IonIcon],
  templateUrl: './scout-map.html',
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
        overflow: hidden;
      }
    `,
  ],
})
export class ScoutMapPage {
  // Simulamos datos de "Autos Perdidos" para el Hackathon
  bounties = signal<BountyMapItem[]>([
    {
      id: 'bounty-1',
      lat: -34.6037, // Buenos Aires Obelisco area
      lng: -58.3816,
      reward: 500,
      carModel: 'Toyota Corolla 2024',
      lastSeen: 'Hace 2 horas',
    },
    {
      id: 'bounty-2',
      lat: -34.5837, // Palermo
      lng: -58.4016,
      reward: 350,
      carModel: 'Peugeot 208',
      lastSeen: 'Hace 15 min',
    },
  ]);

  selectedBounty = signal<BountyMapItem | null>(null);

  constructor() {
    addIcons({ locateOutline, scanOutline, alertCircle, closeOutline });
  }

  selectBounty(bounty: BountyMapItem) {
    this.selectedBounty.set(bounty);
  }

  clearSelection() {
    this.selectedBounty.set(null);
  }
}
