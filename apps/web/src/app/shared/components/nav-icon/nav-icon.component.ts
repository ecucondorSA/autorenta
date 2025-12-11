import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente de iconos SVG premium para la navegación inferior.
 * Usa el sprite sheet dedicado bottom-nav.svg con iconos de alta calidad.
 *
 * @example
 * <app-nav-icon name="nav-car" />
 * <app-nav-icon name="nav-message" [active]="true" />
 */
@Component({
  selector: 'app-nav-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      [attr.aria-label]="label"
      [attr.aria-hidden]="!label"
      [attr.role]="label ? 'img' : null"
      [class]="cssClass"
    >
      <use [attr.href]="spriteUrl + '#' + iconId"></use>
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      svg {
        flex-shrink: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavIconComponent {
  /** Nombre del icono (nav-car, nav-plus, nav-message, nav-calendar, nav-menu) */
  @Input({ required: true }) name!: string;

  /** Si el icono está en estado activo (usa variante -active) */
  @Input() active: boolean = false;

  /** Tamaño en píxeles */
  @Input() size: number = 24;

  /** Texto alternativo para accesibilidad */
  @Input() label?: string;

  /** Clases CSS adicionales para el SVG */
  @Input() cssClass: string = '';

  /** URL del sprite sheet premium para bottom nav */
  readonly spriteUrl = 'assets/icons/bottom-nav.svg';

  /** Retorna el ID del icono, con sufijo -active si corresponde */
  get iconId(): string {
    return this.active ? `${this.name}-active` : this.name;
  }
}
