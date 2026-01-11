import { Injectable } from '@angular/core';
import { Booking } from '../../../../core/models';
import { GuaranteeBreakdown } from './risk-calculator';

export interface GuaranteeCopySummary {
  headline: string;
  details: string[];
  summary: Array<{ label: string; value: string }>;
}

@Injectable({
  providedIn: 'root',
})
export class GuaranteeCopyBuilder {
  buildGuaranteeCopy(_booking: Booking, guarantee: GuaranteeBreakdown): GuaranteeCopySummary {
    const formatterUsd = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });

    const franchiseStandard = formatterUsd.format(guarantee.franchiseStandardUsd);
    const franchiseRollover = formatterUsd.format(guarantee.franchiseRolloverUsd);

    if (guarantee.paymentMethod === 'credit_card' || guarantee.paymentMethod === 'partial_wallet') {
      const holdUsd = formatterUsd.format(guarantee.holdUsd);
      return {
        headline: `Garantía (preautorización reembolsable): ${holdUsd} (estimado).`,
        details: [
          'Si todo está en orden al cierre, liberamos la preautorización automáticamente.',
          'Capturamos solo lo necesario para combustible, limpieza o daños hasta tu franquicia.',
          'Reautorizamos reservas mayores a 7 días para mantener la cobertura.',
        ],
        summary: [
          { label: 'Franquicia daño/robo', value: franchiseStandard },
          { label: 'Franquicia por vuelco', value: franchiseRollover },
          { label: 'Garantía (hold)', value: holdUsd },
        ],
      };
    }

    const creditSecurityUsd = formatterUsd.format(guarantee.creditSecurityUsd);

    return {
      headline: `Crédito de Seguridad: pagás ${creditSecurityUsd}. Queda en tu wallet (no retirable).`,
      details: [
        'Usamos primero este crédito ante gastos o daños; si no se usa, queda para futuras reservas.',
        'Si el cargo supera la franquicia, te pediremos un top-up o transferencia.',
        'Podemos activar el FGO (hasta USD 800/evento) si presentás evidencia completa y tu score RC ≥ 1.0.',
      ],
      summary: [
        { label: 'Franquicia daño/robo', value: franchiseStandard },
        { label: 'Franquicia por vuelco', value: franchiseRollover },
        { label: 'Crédito de seguridad', value: creditSecurityUsd },
      ],
    };
  }
}
