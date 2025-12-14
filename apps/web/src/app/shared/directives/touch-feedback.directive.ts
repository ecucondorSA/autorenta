import { Directive, HostListener, inject, Input } from '@angular/core';
import { HapticFeedbackService } from '../../core/services/haptic-feedback.service';

/**
 * TouchFeedbackDirective
 * Aplica feedback háptico a los botones de Ionic (<ion-button>) al hacer clic.
 *
 * Uso:
 * Aplícala a un <ion-button> directamente: <ion-button appTouchFeedback>
 * O simplemente declárala en un módulo compartido para que funcione globalmente.
 *
 * @example
 * <ion-button appTouchFeedback fill="solid">Mi Botón</ion-button>
 */
@Directive({
  selector: 'ion-button', // Aplica esta directiva a todos los <ion-button>
  standalone: true,
})
export class TouchFeedbackDirective {
  private readonly hapticService = inject(HapticFeedbackService);

  // Puedes añadir un @Input para desactivar el haptic si es necesario
  @Input() appDisableHaptic: boolean = false;

  constructor() {
    // console.log('TouchFeedbackDirective initialized for:', this.el?.nativeElement);
  }

  @HostListener('click')
  onClick(): void {
    if (!this.appDisableHaptic) {
      // Usamos un haptic de tipo "light" por defecto para los clicks generales
      this.hapticService.light();
    }
  }
}
