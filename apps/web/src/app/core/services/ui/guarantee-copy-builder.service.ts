import { Injectable, inject } from '@angular/core';
import { FranchiseTableService } from '@core/services/payments/franchise-table.service';
import { RiskCalculation } from '@core/services/verification/risk-calculator.service';

/**
 * Copy completo de garantía para checkout/voucher
 */
export interface GuaranteeCopy {
  // Sección principal
  title: string;
  subtitle: string;
  description: string;

  // Montos
  amountArs: string;
  amountUsd: string;
  amountLabel: string;

  // Franquicias
  franchiseTable: {
    standardUsd: string;
    rolloverUsd: string;
  };

  // Ejemplo de cálculo
  exampleScenario: string;

  // Disclaimers
  disclaimers: string[];

  // FAQ
  faqs: Array<{ question: string; answer: string }>;
}

/**
 * Servicio de Generación de Copy UX (Argentina)
 *
 * Genera todos los textos dinámicos para el checkout y voucher según:
 * - Tipo de garantía (hold con tarjeta / crédito de seguridad sin tarjeta)
 * - Franquicias (estándar y rollover)
 * - Tasas FX snapshot
 * - Ejemplos de cálculo prácticos
 *
 * Cumple con los requisitos AR de:
 * - Mostrar siempre USD como moneda principal
 * - Tabla comparativa de franquicias
 * - Ejemplos claros de uso
 * - Disclaimers legales
 */
@Injectable({
  providedIn: 'root',
})
export class GuaranteeCopyBuilderService {
  private readonly franchiseService = inject(FranchiseTableService);

  /**
   * Genera el copy completo para el checkout
   */
  buildCheckoutCopy(risk: RiskCalculation): GuaranteeCopy {
    const isHold = risk.guaranteeType === 'hold';

    return {
      // Sección principal
      title: isHold ? 'Garantía Reembolsable' : 'Crédito de Seguridad',
      subtitle: isHold ? 'Preautorización en tu tarjeta' : 'Depósito no reembolsable en tu wallet',

      description: this.buildDescription(risk),

      // Montos
      amountArs: '',
      amountUsd: this.franchiseService.formatUsd(risk.guaranteeAmountUsd),
      amountLabel: isHold ? 'Hold estimado' : 'Crédito requerido',

      // Franquicias
      franchiseTable: {
        standardUsd: this.franchiseService.formatUsd(risk.standardFranchiseUsd),
        rolloverUsd: this.franchiseService.formatUsd(risk.rolloverFranchiseUsd),
      },

      // Ejemplo de cálculo
      exampleScenario: this.buildExampleScenario(risk),

      // Disclaimers
      disclaimers: this.buildDisclaimers(risk),

      // FAQ
      faqs: this.buildFaqs(risk),
    };
  }

  /**
   * Genera descripción principal
   */
  private buildDescription(risk: RiskCalculation): string {
    if (risk.guaranteeType === 'hold') {
      return (
        `Se preautorizará ${this.franchiseService.formatUsd(risk.guaranteeAmountUsd)} ` +
        `en tu tarjeta. ` +
        `Este monto NO se cobrará, solo quedará "retenido" temporalmente. ` +
        `\n\nSi entregas el auto en perfecto estado, se libera automáticamente en 24-48 horas. ` +
        `Si hay gastos (combustible, limpieza) o daños, solo capturamos lo necesario hasta tu franquicia.`
      );
    } else {
      return (
        `Pagarás ${this.franchiseService.formatUsd(risk.guaranteeAmountUsd)} ` +
        `como Crédito de Seguridad. ` +
        `Este monto queda en tu wallet y NO es retirable. ` +
        `\n\nSe usa primero para cubrir gastos o daños durante el alquiler. ` +
        `Si no se usa, queda disponible para tus próximas reservas en AutoRenta.`
      );
    }
  }

  /**
   * Genera ejemplo de cálculo práctico
   */
  private buildExampleScenario(risk: RiskCalculation): string {
    const damageUsd = 420;
    const cleaningUsd = 25;
    const totalUsd = damageUsd + cleaningUsd;

    if (risk.guaranteeType === 'hold') {
      return (
        `📝 Ejemplo: Daños menores (${this.franchiseService.formatUsd(damageUsd)}) ` +
        `+ limpieza (${this.franchiseService.formatUsd(cleaningUsd)}) ` +
        `= ${this.franchiseService.formatUsd(totalUsd)}\n\n` +
        `✅ Se captura solo ${this.franchiseService.formatUsd(totalUsd)} y se libera el resto del hold.`
      );
    } else {
      const creditUsd = risk.guaranteeAmountUsd;
      const remainingUsd = totalUsd - creditUsd;

      if (remainingUsd > 0) {
        return (
          `📝 Ejemplo: Daños (${this.franchiseService.formatUsd(damageUsd)}) + limpieza (${this.franchiseService.formatUsd(cleaningUsd)}) ` +
          `= ${this.franchiseService.formatUsd(totalUsd)}\n\n` +
          `✅ Se debitan ${this.franchiseService.formatUsd(creditUsd)} de tu Crédito de Seguridad.\n` +
          `⚠️ Deberías pagar ${this.franchiseService.formatUsd(remainingUsd)} adicionales (top-up en 72 horas).`
        );
      } else {
        return (
          `📝 Ejemplo: Daños menores (${this.franchiseService.formatUsd(damageUsd)}) + limpieza (${this.franchiseService.formatUsd(cleaningUsd)}) ` +
          `= ${this.franchiseService.formatUsd(totalUsd)}\n\n` +
          `✅ Se debitan ${this.franchiseService.formatUsd(totalUsd)} de tu Crédito de Seguridad.\n` +
          `✅ Te quedan ${this.franchiseService.formatUsd(creditUsd - totalUsd)} disponibles.`
        );
      }
    }
  }

  /**
   * Genera disclaimers legales
   */
  private buildDisclaimers(risk: RiskCalculation): string[] {
    const disclaimers = [
      `Franquicia estándar (daño/robo): ${this.franchiseService.formatUsd(risk.standardFranchiseUsd)}`,
      `Franquicia por vuelco (rollover): ${this.franchiseService.formatUsd(risk.rolloverFranchiseUsd)} (2× la estándar)`,
    ];

    if (risk.guaranteeType === 'hold') {
      disclaimers.push(
        'El hold puede reautorizarse cada 6-7 días en alquileres largos (>7 días)',
        'Si el hold falla, se te solicitará un método de pago alternativo o se cancelará la reserva',
      );
    } else {
      disclaimers.push(
        'El Crédito de Seguridad NO es reembolsable, pero queda disponible para futuras reservas',
        'Si los gastos superan el crédito, debes completar el pago en 72 horas o tu cuenta será bloqueada',
      );
    }

    if (risk.requiresRevalidation) {
      disclaimers.push(
        '⚠️ Este cálculo requiere revalidación. La tasa FX ha variado más del 10% o han pasado más de 7 días desde la reserva.',
      );
    }

    return disclaimers;
  }

  /**
   * Genera FAQs dinámicas
   */
  private buildFaqs(risk: RiskCalculation): Array<{ question: string; answer: string }> {
    const faqs: Array<{ question: string; answer: string }> = [];

    if (risk.guaranteeType === 'hold') {
      faqs.push(
        {
          question: '¿Cuándo se libera el hold?',
          answer:
            'Automáticamente en 24-48 horas después de devolver el auto en perfecto estado. ' +
            'Si hay gastos o daños, se captura solo lo necesario y se libera el resto.',
        },
        {
          question: '¿Qué pasa si el hold falla?',
          answer:
            'Te notificaremos de inmediato. Deberás proveer otro método de pago o completar el depósito por wallet. ' +
            'Si no se resuelve, la reserva puede cancelarse.',
        },
        {
          question: '¿Puedo usar mi tarjeta de débito?',
          answer:
            'Depende del banco. Algunas tarjetas de débito permiten preautorizaciones, pero no todas. ' +
            'Si no funciona, puedes pagar con wallet o parcial (wallet + tarjeta).',
        },
      );
    } else {
      faqs.push(
        {
          question: '¿Puedo recuperar el Crédito de Seguridad?',
          answer:
            'No es reembolsable, pero queda en tu wallet para futuras reservas en AutoRenta. ' +
            'Solo se debita si hay gastos o daños durante el alquiler.',
        },
        {
          question: '¿Qué pasa si los gastos superan mi crédito?',
          answer:
            'Deberás completar el pago en 72 horas. Si no lo haces, tu cuenta será bloqueada temporalmente. ' +
            'Si los daños superan tu franquicia, el FGO puede ayudarte (según disponibilidad).',
        },
        {
          question: '¿Por qué no puedo retirar este dinero?',
          answer:
            'Es un crédito de seguridad, no un depósito reembolsable. Está diseñado para cubrir gastos operativos ' +
            'y garantizar que puedas alquilar sin tarjeta de crédito.',
        },
      );
    }

    // FAQs comunes
    faqs.push(
      {
        question: '¿Qué cubre mi franquicia?',
        answer:
          `Tu franquicia (${this.franchiseService.formatUsd(risk.standardFranchiseUsd)}) es el monto máximo que pagarías ` +
          `en caso de daños, robo o pérdida total. Si el daño es mayor, el locador puede cobrar el resto o el FGO puede ayudarte. ` +
          `En caso de vuelco, la franquicia es ${this.franchiseService.formatUsd(risk.rolloverFranchiseUsd)} (2× la estándar).`,
      },
      {
        question: '¿Qué es el FGO?',
        answer:
          'El Fondo de Garantía Operativa (FGO) es un fondo comunitario que ayuda a cubrir daños cuando el locatario ' +
          'no puede pagar su franquicia completa. Tiene límites (USD 800 por evento) y depende de la solvencia del fondo.',
      },
    );

    return faqs;
  }

  /**
   * Genera resumen breve para confirmación
   */
  buildSummaryLine(risk: RiskCalculation): string {
    if (risk.guaranteeType === 'hold') {
      return `Hold ${this.franchiseService.formatUsd(risk.guaranteeAmountUsd)}`;
    } else {
      return `Crédito ${this.franchiseService.formatUsd(risk.guaranteeAmountUsd)}`;
    }
  }
}
