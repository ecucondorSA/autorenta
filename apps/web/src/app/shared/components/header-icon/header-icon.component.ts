import { Component, Input, ChangeDetectionStrategy } from '@angular/core';


/**
 * Componente de iconos SVG premium para el header.
 * Usa el sprite sheet dedicado header-icons.svg con iconos de alta calidad.
 *
 * @example
 * <app-header-icon name="search" />
 * <app-header-icon name="bell" [active]="true" />
 * <app-header-icon name="bell-badge" [size]="22" />
 */
@Component({
  selector: 'app-header-icon',
  standalone: true,
  imports: [],
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
        transition: transform 0.15s ease, opacity 0.15s ease;
      }
      :host:hover svg {
        transform: scale(1.05);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderIconComponent {
  /**
   * Nombre del icono (sin prefijo "header-")
   * Opciones: search, help, bell, bell-badge, share, user, user-circle,
   * globe, chevron-down, chevron-up, menu, close, plus, plus-circle, flag-ar, car
   */
  @Input({ required: true }) name!: string;

  /** Si el icono está en estado activo (usa variante -active si existe) */
  @Input() active: boolean = false;

  /** Tamaño en píxeles */
  @Input() size: number = 24;

  /** Texto alternativo para accesibilidad */
  @Input() label?: string;

  /** Clases CSS adicionales para el SVG */
  @Input() cssClass: string = '';

  /** URL del sprite sheet premium para header */
  readonly spriteUrl = 'assets/icons/header-icons.svg';

  /** Genera el ID del icono basado en nombre y estado activo */
  get iconId(): string {
    if (this.active) {
      return `header-${this.name}-active`;
    }
    return `header-${this.name}`;
  }
}
