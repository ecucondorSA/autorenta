import { CommonModule } from '@angular/common';
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FgoV1_1Service } from '../../../core/services/fgo-v1-1.service';
import { DamageItem, SettlementService } from '../../../core/services/settlement.service';

@Component({
  selector: 'app-damage-comparison',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './damage-comparison.component.html',
  styleUrls: ['./damage-comparison.component.scss'],
})
export class DamageComparisonComponent implements OnInit {
  readonly bookingId = input.required<string>();
  readonly damagesDetected = output<DamageItem[]>();

  private readonly settlementService = inject(SettlementService);
  private readonly fgoV1_1Service = inject(FgoV1_1Service);

  readonly loading = signal(false);
  readonly comparing = signal(false);
  readonly damages = signal<DamageItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly hasCheckIn = signal(false);
  readonly hasCheckOut = signal(false);
  readonly validationResult = signal<{ valid: boolean; missing: string[] } | null>(null);

  async ngOnInit(): Promise<void> {
    await this.validateInspections();
  }

  async validateInspections(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const result = await this.settlementService.validateInspections(this.bookingId());
      this.validationResult.set(result);
      this.hasCheckIn.set(!result.missing.includes('check_in'));
      this.hasCheckOut.set(!result.missing.includes('check_out'));

      if (!result.valid) {
        this.error.set(`Faltan inspecciones: ${result.missing.join(', ')}`);
      }
    } catch (err) {
      console.error('Error validating inspections:', err);
      this.error.set('Error al validar inspecciones');
    } finally {
      this.loading.set(false);
    }
  }

  async compareDamages(): Promise<void> {
    if (!this.validationResult()?.valid) {
      this.error.set('Debe haber inspecciones completas (check-in y check-out)');
      return;
    }

    this.comparing.set(true);
    this.error.set(null);

    try {
      const detectedDamages = await this.settlementService.compareDamages(this.bookingId());
      this.damages.set(detectedDamages);

      if (detectedDamages.length === 0) {
        this.error.set('No se detectaron daños nuevos. El auto está en buen estado.');
      } else {
        this.damagesDetected.emit(detectedDamages);
      }
    } catch (err) {
      console.error('Error comparing damages:', err);
      this.error.set('Error al comparar daños');
    } finally {
      this.comparing.set(false);
    }
  }

  getDamageTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      scratch: 'Rayón',
      dent: 'Abolladura',
      broken_glass: 'Vidrio roto',
      tire_damage: 'Daño en neumático',
      mechanical: 'Falla mecánica',
      interior: 'Daño interior',
      missing_item: 'Artículo faltante',
      other: 'Otro',
    };
    return labels[type] || type;
  }

  getSeverityLabel(severity: string): string {
    const labels: Record<string, string> = {
      minor: 'Leve',
      moderate: 'Moderado',
      severe: 'Grave',
    };
    return labels[severity] || severity;
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'minor':
        return 'success';
      case 'moderate':
        return 'warning';
      case 'severe':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getTotalDamageCost(): string {
    return this.damages()
      .reduce((sum, d) => sum + d.estimatedCostUsd, 0)
      .toFixed(2);
  }
}
