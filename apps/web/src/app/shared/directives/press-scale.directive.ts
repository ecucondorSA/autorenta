import {
  Directive,
  ElementRef,
  HostListener,
  inject,
  input,
} from '@angular/core';
import { HapticFeedbackService } from '@core/services/ui/haptic-feedback.service';

/**
 * Directiva que aplica un efecto de escala al presionar.
 * Tendencia UI 2026: Feedback táctil en interacciones.
 *
 * @example
 * ```html
 * <button appPressScale>Botón con feedback</button>
 * <button appPressScale [scaleAmount]="0.92">Más pronunciado</button>
 * <button appPressScale [haptic]="true">Con vibración</button>
 * ```
 */
@Directive({
  selector: '[appPressScale]',
  standalone: true,
})
export class PressScaleDirective {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly hapticService = inject(HapticFeedbackService, { optional: true });

  /** Escala al presionar (default: 0.96) */
  readonly scaleAmount = input<number>(0.96);

  /** Duración de la transición en ms (default: 100) */
  readonly duration = input<number>(100);

  /** Habilitar feedback háptico (default: false) */
  readonly haptic = input<boolean>(false);

  /** Deshabilitar el efecto */
  readonly disabled = input<boolean>(false);

  constructor() {
    this.setupStyles();
  }

  private setupStyles(): void {
    const element = this.el.nativeElement;
    element.style.transition = `transform ${this.duration()}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    element.style.willChange = 'transform';
    element.style.cursor = 'pointer';
    element.style.userSelect = 'none';
    element.style.webkitTapHighlightColor = 'transparent';
  }

  @HostListener('mousedown')
  @HostListener('touchstart', ['$event'])
  onPress(event?: TouchEvent): void {
    if (this.disabled()) return;

    // Prevenir scroll en touch
    if (event?.cancelable) {
      event.preventDefault();
    }

    const element = this.el.nativeElement;
    element.style.transform = `scale(${this.scaleAmount()})`;

    if (this.haptic() && this.hapticService) {
      this.hapticService.light();
    }
  }

  @HostListener('mouseup')
  @HostListener('mouseleave')
  @HostListener('touchend')
  @HostListener('touchcancel')
  onRelease(): void {
    if (this.disabled()) return;

    const element = this.el.nativeElement;
    element.style.transform = 'scale(1)';
  }
}
