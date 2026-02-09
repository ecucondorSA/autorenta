import { Directive, ElementRef, inject, input, effect, signal, output } from '@angular/core';

/**
 * Directiva que aplica animación de colapso/expansión con efecto spring.
 * Tendencia UI 2026: Animaciones con física natural.
 *
 * @example
 * ```html
 * <div appSpringCollapse [collapsed]="isCollapsed()">
 *   Contenido colapsable
 * </div>
 *
 * <!-- Con callback de animación completada -->
 * <div
 *   appSpringCollapse
 *   [collapsed]="isCollapsed()"
 *   (animationComplete)="onAnimationDone($event)">
 *   Contenido
 * </div>
 * ```
 */
@Directive({
  selector: '[appSpringCollapse]',
  standalone: true,
})
export class SpringCollapseDirective {
  private readonly el = inject(ElementRef<HTMLElement>);

  /** Estado colapsado (true = oculto, false = visible) */
  readonly collapsed = input<boolean>(false);

  /** Duración de la animación en ms (default: 300) */
  readonly duration = input<number>(300);

  /** Deshabilitar la animación */
  readonly disabled = input<boolean>(false);

  /** Evento emitido cuando la animación completa */
  readonly animationComplete = output<boolean>();

  private isAnimating = signal(false);
  private contentHeight = 0;

  constructor() {
    // Reaccionar a cambios en collapsed
    effect(() => {
      const isCollapsed = this.collapsed();

      if (this.disabled()) {
        this.setVisibility(!isCollapsed);
        return;
      }

      this.animate(isCollapsed);
    });
  }

  private setVisibility(visible: boolean): void {
    const element = this.el.nativeElement;
    element.style.display = visible ? '' : 'none';
    element.style.overflow = '';
    element.style.height = '';
  }

  private animate(shouldCollapse: boolean): void {
    if (this.isAnimating()) return;

    const element = this.el.nativeElement;
    const duration = this.duration();

    // Respetar prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.setVisibility(!shouldCollapse);
      this.animationComplete.emit(shouldCollapse);
      return;
    }

    this.isAnimating.set(true);

    // Configurar transición con curva spring
    element.style.transition = `height ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity ${duration}ms ease-out`;
    element.style.overflow = 'hidden';
    element.style.willChange = 'height, opacity';

    if (shouldCollapse) {
      // Colapsar: de altura actual a 0
      this.contentHeight = element.scrollHeight;
      element.style.height = `${this.contentHeight}px`;

      // Forzar reflow para que el navegador calcule el layout
      void element.offsetHeight;

      element.style.height = '0';
      element.style.opacity = '0';
    } else {
      // Expandir: de 0 a altura natural
      element.style.display = '';
      this.contentHeight = element.scrollHeight;
      element.style.height = '0';
      element.style.opacity = '0';

      // Forzar reflow para que el navegador calcule el layout
      void element.offsetHeight;

      element.style.height = `${this.contentHeight}px`;
      element.style.opacity = '1';
    }

    // Cleanup después de la animación
    setTimeout(() => {
      element.style.overflow = '';
      element.style.height = '';
      element.style.willChange = 'auto';
      element.style.transition = '';

      if (shouldCollapse) {
        element.style.display = 'none';
        element.style.opacity = '';
      } else {
        element.style.opacity = '';
      }

      this.isAnimating.set(false);
      this.animationComplete.emit(shouldCollapse);
    }, duration);
  }
}
