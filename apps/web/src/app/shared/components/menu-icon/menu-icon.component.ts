import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

/**
 * Componente de iconos SVG premium para el menú drawer.
 * Usa el sprite sheet dedicado menu-icons.svg con iconos de alta calidad.
 *
 * @example
 * <app-menu-icon name="calendar" />
 * <app-menu-icon name="wallet" [size]="20" />
 */
@Component({
  selector: 'app-menu-icon',
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
      <use [attr.href]="spriteUrl + '#menu-' + name"></use>
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
export class MenuIconComponent {
  /**
   * Nombre del icono (sin prefijo "menu-")
   * Ej: calendar, wallet, user, settings, etc.
   */
  @Input({ required: true }) name!: string;

  /** Tamaño en píxeles */
  @Input() size: number = 20;

  /** Texto alternativo para accesibilidad */
  @Input() label?: string;

  /** Clases CSS adicionales para el SVG */
  @Input() cssClass: string = '';

  /** URL del sprite sheet premium para menu */
  readonly spriteUrl = 'assets/icons/menu-icons.svg';
}
