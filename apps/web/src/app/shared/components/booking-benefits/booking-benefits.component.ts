import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Car } from '../../../core/models';

export interface BookingBenefit {
  icon: string;
  title: string;
  description: string;
  highlight?: boolean;
}

@Component({
  selector: 'app-booking-benefits',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-benefits.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingBenefitsComponent {
  @Input() car: Car | null = null;
  @Input() compact = false; // Modo compacto para sidebar

  /**
   * Beneficios dinámicos basados en las características del auto
   */
  get benefits(): BookingBenefit[] {
    const baseBenefits: BookingBenefit[] = [
      {
        icon: 'cancel',
        title: 'Cancelación gratuita',
        description: 'Hasta 24hs antes del inicio',
        highlight: true,
      },
      {
        icon: 'shield',
        title: this.car?.insurance_included ? 'Seguro incluido' : 'Seguro disponible',
        description: this.car?.insurance_included
          ? 'Cobertura completa sin costo extra'
          : 'Opción de seguro al reservar',
      },
      {
        icon: 'support',
        title: 'Asistencia 24/7',
        description: 'Soporte técnico siempre disponible',
      },
      {
        icon: 'no-hidden-fees',
        title: 'Sin cargos ocultos',
        description: 'El precio que ves es el precio final',
      },
      {
        icon: 'payment',
        title: 'Pago seguro',
        description: 'MercadoPago - Protección al comprador',
        highlight: true,
      },
    ];

    // Agregar beneficio de confirmación instantánea si aplica
    if (this.car?.auto_approval) {
      baseBenefits.splice(1, 0, {
        icon: 'instant',
        title: 'Confirmación instantánea',
        description: 'Reserva aprobada automáticamente',
        highlight: true,
      });
    }

    // Agregar beneficio de depósito bajo si aplica
    if (this.car?.deposit_required && this.car.deposit_amount) {
      const depositAmount = typeof this.car.deposit_amount === 'string'
        ? parseFloat(this.car.deposit_amount)
        : this.car.deposit_amount;

      if (depositAmount < 5000) {
        baseBenefits.push({
          icon: 'wallet',
          title: 'Depósito accesible',
          description: `Solo $${depositAmount} (se devuelve)`,
        });
      }
    }

    return baseBenefits;
  }

  /**
   * Obtiene el icono SVG correspondiente
   */
  getIconPath(icon: string): string {
    const icons: Record<string, string> = {
      cancel: 'M6 18L18 6M6 6l12 12',
      shield:
        'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      support: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z',
      'no-hidden-fees': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      payment:
        'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
      instant:
        'M13 10V3L4 14h7v7l9-11h-7z',
      wallet:
        'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    };

    return icons[icon] || icons['shield'];
  }

  /**
   * Verifica si es un icono con círculo (checkmark)
   */
  isCircleIcon(icon: string): boolean {
    return ['cancel', 'no-hidden-fees'].includes(icon);
  }
}
