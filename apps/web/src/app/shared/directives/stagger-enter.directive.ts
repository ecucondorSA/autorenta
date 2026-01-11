import {
  Directive,
  ElementRef,
  inject,
  input,
  AfterViewInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { take } from 'rxjs/operators';

/**
 * Directiva que aplica animación de entrada escalonada a elementos.
 * Tendencia UI 2026: Motion design con stagger animations.
 *
 * @example
 * ```html
 * <!-- En un @for, cada item entra con delay -->
 * @for (item of items; track item.id; let i = $index) {
 *   <div appStaggerEnter [staggerIndex]="i">{{ item.name }}</div>
 * }
 *
 * <!-- Con delay base personalizado -->
 * <div appStaggerEnter [staggerIndex]="0" [baseDelay]="100">Primero</div>
 * ```
 */
@Directive({
  selector: '[appStaggerEnter]',
  standalone: true,
})
export class StaggerEnterDirective implements AfterViewInit {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  /** Índice del elemento para calcular el delay (default: 0) */
  readonly staggerIndex = input<number>(0);

  /** Delay base entre elementos en ms (default: 50) */
  readonly baseDelay = input<number>(50);

  /** Delay máximo total en ms (default: 500) */
  readonly maxDelay = input<number>(500);

  /** Duración de la animación en ms (default: 400) */
  readonly duration = input<number>(400);

  /** Distancia de entrada en píxeles (default: 20) */
  readonly distance = input<number>(20);

  /** Deshabilitar la animación */
  readonly disabled = input<boolean>(false);

  /** Respetar prefers-reduced-motion (default: true) */
  readonly respectMotion = input<boolean>(true);

  ngAfterViewInit(): void {
    if (this.disabled()) return;

    // Respetar preferencias de movimiento reducido
    if (this.respectMotion() && this.prefersReducedMotion()) {
      this.showImmediately();
      return;
    }

    this.animateIn();
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private showImmediately(): void {
    const element = this.el.nativeElement;
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
  }

  private animateIn(): void {
    const element = this.el.nativeElement;
    const index = this.staggerIndex();
    const delay = Math.min(index * this.baseDelay(), this.maxDelay());
    const duration = this.duration();
    const distance = this.distance();

    // Estado inicial (invisible y desplazado)
    element.style.opacity = '0';
    element.style.transform = `translateY(${distance}px)`;
    element.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    element.style.willChange = 'opacity, transform';

    // Animar después del delay
    timer(delay)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';

        // Limpiar will-change después de la animación
        timer(duration)
          .pipe(take(1), takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            element.style.willChange = 'auto';
          });
      });
  }
}
