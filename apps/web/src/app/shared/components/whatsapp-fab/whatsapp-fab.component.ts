import { Component, Input, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Car } from '../../../core/models';
import { AnalyticsService } from '../../../core/services/analytics.service';

@Component({
  selector: 'app-whatsapp-fab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './whatsapp-fab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappFabComponent {
  private readonly analytics = inject(AnalyticsService);

  @Input() car: Car | null = null;
  @Input() ownerPhone: string | null = null;
  @Input() ownerName: string | null = null;

  /**
   * Construye el mensaje predefinido para WhatsApp
   */
  get whatsappMessage(): string {
    const carInfo = this.car ? `${this.car.brand} ${this.car.model} ${this.car.year}` : 'el auto';

    return encodeURIComponent(
      `Hola! Vi tu publicación de ${carInfo} en AutoRenta y me gustaría consultarte sobre disponibilidad y condiciones de alquiler.`,
    );
  }

  /**
   * Construye el enlace de WhatsApp
   */
  get whatsappLink(): string | null {
    if (!this.ownerPhone) return null;

    // Limpiar el número (remover espacios, guiones, paréntesis)
    const cleanPhone = this.ownerPhone.replace(/[^0-9+]/g, '');

    // WhatsApp link: https://wa.me/{phone}?text={message}
    return `https://wa.me/${cleanPhone}?text=${this.whatsappMessage}`;
  }

  /**
   * Handler de click en el botón de WhatsApp
   */
  onWhatsAppClick(): void {
    if (!this.whatsappLink) return;

    // Track: Owner contact clicked
    this.analytics.trackEvent('owner_contact_clicked', {
      car_id: this.car?.id ?? undefined,
      contact_method: 'whatsapp',
      owner_name: this.ownerName ?? undefined,
    });

    // Abrir WhatsApp en nueva ventana
    window.open(this.whatsappLink, '_blank');
  }

  /**
   * Determina si mostrar el botón
   */
  get shouldShow(): boolean {
    return !!this.ownerPhone && !!this.car;
  }
}
