import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Stat {
  label: string;
  value: string | number;
  icon?: string;
}

@Component({
  selector: 'app-stats-strip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-strip.component.html',
  styleUrls: ['./stats-strip.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsStripComponent {
  @Input() stats: Stat[] = [
    { label: 'Autos disponibles', value: '+2k', icon: '🚗' },
    { label: 'Soporte', value: '24/7', icon: '💬' },
    { label: 'Usuarios activos', value: '+500', icon: '👥' },
  ];
}


