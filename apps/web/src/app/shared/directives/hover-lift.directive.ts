import {
  Directive,
  ElementRef,
  HostListener,
  inject,
  input,
} from '@angular/core';

/**
 * Directiva que aplica un efecto de elevación sutil en hover.
 * Tendencia UI 2026: Micro-interacciones táctiles.
 *
 * @example
 * ```html
 * <div appHoverLift>Card con efecto lift</div>
 * <div appHoverLift [liftAmount]="8">Lift más pronunciado</div>
 * <div appHoverLift [disabled]="isDisabled">Condicional</div>
 * ```
 */
@Directive({
  selector: '[appHoverLift]',
  standalone: true,
})
export class HoverLiftDirective {
  private readonly el = inject(ElementRef<HTMLElement>);

  /** Cantidad de elevación en píxeles (default: 4) */
  readonly liftAmount = input<number>(4);

  /** Duración de la transición en ms (default: 200) */
  readonly duration = input<number>(200);

  /** Deshabilitar el efecto */
  readonly disabled = input<boolean>(false);

  /** Escala adicional en hover (default: 1.01) */
  readonly scale = input<number>(1.01);

  constructor() {
    this.setupStyles();
  }

  private setupStyles(): void {
    const element = this.el.nativeElement;
    element.style.transition = `transform ${this.duration()}ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow ${this.duration()}ms ease-out`;
    element.style.willChange = 'transform, box-shadow';
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.disabled()) return;

    const element = this.el.nativeElement;
    const lift = this.liftAmount();
    const scaleValue = this.scale();

    element.style.transform = `translateY(-${lift}px) scale(${scaleValue})`;
    element.style.boxShadow = `0 ${lift * 2}px ${lift * 4}px rgba(0, 0, 0, 0.1)`;
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    if (this.disabled()) return;

    const element = this.el.nativeElement;
    element.style.transform = 'translateY(0) scale(1)';
    element.style.boxShadow = '';
  }

  @HostListener('focus')
  onFocus(): void {
    this.onMouseEnter();
  }

  @HostListener('blur')
  onBlur(): void {
    this.onMouseLeave();
  }
}
