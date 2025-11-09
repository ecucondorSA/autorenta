import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-info-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './info-banner.component.html',
  styleUrls: ['./info-banner.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoBannerComponent {
  @Input() title = 'Marketplace P2P verificado';
  @Input() description =
    'Conectamos personas con autos verificados. Sin intermediarios, sin tarjetas.';
  @Input() variant: 'info' | 'success' | 'warning' = 'info';
}
