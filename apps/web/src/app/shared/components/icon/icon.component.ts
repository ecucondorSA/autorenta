import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

/**
 * Componente de iconos SVG reutilizable usando sprite sheet.
 *
 * @example
 * <app-icon name="ac" />
 * <app-icon name="bluetooth" size="32" />
 * <app-icon name="gps" label="GPS Navigation" class="text-blue-500" />
 */
@Component({
  selector: 'app-icon',
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
      fill="none"
      stroke="currentColor"
    >
      <use [attr.href]="spriteUrl + '#' + name"></use>
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
export class IconComponent {
  /** Nombre del icono en el sprite (sin prefijo) */
  @Input({ required: true }) name!: string;

  /** Tamaño en píxeles. Valores comunes: 16, 20, 24, 32, 48 */
  @Input() size: number = 24;

  /** Texto alternativo para accesibilidad. Si no se provee, el icono se marca como decorativo */
  @Input() label?: string;

  /** Clases CSS adicionales para el SVG */
  @Input() cssClass: string = '';

  /** URL del sprite sheet */
  readonly spriteUrl = 'assets/icons/sprite.svg';
}
