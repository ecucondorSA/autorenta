import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-distance-summary',
  imports: [CommonModule],
  templateUrl: './distance-summary.component.html',
  styleUrls: ['./distance-summary.component.css'],
})
export class DistanceSummaryComponent {
  @Input() distanceKm!: number;
  @Input() distanceTier!: 'local' | 'regional' | 'long_distance';
  @Input() deliveryFeeCents?: number;
  @Input() showGuaranteeAdjustment = false;

  getTierLabel(): string {
    switch (this.distanceTier) {
      case 'local':
        return 'Cercano';
      case 'regional':
        return 'Regional';
      case 'long_distance':
        return 'Larga Distancia';
      default:
        return 'Desconocido';
    }
  }

  getTierClass(): string {
    switch (this.distanceTier) {
      case 'local':
        return 'tier-local';
      case 'regional':
        return 'tier-regional';
      case 'long_distance':
        return 'tier-long-distance';
      default:
        return '';
    }
  }

  getTierIcon(): string {
    switch (this.distanceTier) {
      case 'local':
        return 'M5 13l4 4L19 7'; // Check icon
      case 'regional':
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'; // Info icon
      case 'long_distance':
        return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'; // Warning icon
      default:
        return '';
    }
  }

  getTierDescription(): string {
    switch (this.distanceTier) {
      case 'local':
        return 'El auto está cerca de tu ubicación. Sin recargos adicionales.';
      case 'regional':
        return 'El auto está en la región. Puede aplicar un ajuste en la garantía (+15%).';
      case 'long_distance':
        return 'El auto está lejos. Se aplica un ajuste en la garantía (+30%).';
      default:
        return '';
    }
  }

  getGuaranteeMultiplier(): string {
    switch (this.distanceTier) {
      case 'local':
        return '1.0x';
      case 'regional':
        return '1.15x';
      case 'long_distance':
        return '1.3x';
      default:
        return '1.0x';
    }
  }

  formatDistance(): string {
    if (this.distanceKm < 1) {
      return `${Math.round(this.distanceKm * 1000)} m`;
    }
    return `${this.distanceKm.toFixed(1)} km`;
  }

  formatDeliveryFee(): string {
    if (!this.deliveryFeeCents || this.deliveryFeeCents === 0) {
      return 'Gratis';
    }
    return `$${(this.deliveryFeeCents / 100).toFixed(2)} ARS`;
  }
}
