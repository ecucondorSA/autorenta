import { Directive, ElementRef, Input, OnInit } from '@angular/core';

/**
 * P1-018 FIX: Auto Alt Text Directive
 *
 * Automatically adds semantic alt text to images
 * Usage:
 * - <img [appAutoAlt]="car" autoAltType="car">
 * - <img [appAutoAlt]="user" autoAltType="avatar">
 * - <img appAutoAlt autoAltType="logo">
 */
@Directive({
  selector: 'img[appAutoAlt]',
  standalone: true,
})
export class AutoAltDirective implements OnInit {
  @Input() appAutoAlt?: unknown;
  @Input() autoAltType: 'car' | 'avatar' | 'logo' | 'decorative' = 'decorative';

  constructor(private el: ElementRef<HTMLImageElement>) {}

  ngOnInit(): void {
    const img = this.el.nativeElement;

    // Don't override if alt is already set
    if (img.alt && img.alt.trim() !== '') {
      return;
    }

    const altText = this.generateAltText();

    if (altText) {
      img.alt = altText;
    } else {
      // Decorative images should have empty alt but not be removed from accessibility tree
      img.alt = '';
      img.setAttribute('role', 'presentation');
    }
  }

  private generateAltText(): string {
    switch (this.autoAltType) {
      case 'car':
        return this.generateCarAltText();
      case 'avatar':
        return this.generateAvatarAltText();
      case 'logo':
        return 'AutoRenta logo';
      case 'decorative':
      default:
        return '';
    }
  }

  private generateCarAltText(): string {
    const car = this.appAutoAlt as {
      brand?: string;
      model?: string;
      year?: number;
      title?: string;
    };

    if (!car) return 'Vehículo';

    if (car.title) {
      return car.title;
    }

    const parts = [car.brand, car.model, car.year].filter(Boolean);

    if (parts.length === 0) {
      return 'Vehículo';
    }

    return parts.join(' ');
  }

  private generateAvatarAltText(): string {
    const user = this.appAutoAlt as {
      full_name?: string;
      name?: string;
      email?: string;
    };

    if (!user) return 'Foto de perfil';

    const name = user.full_name || user.name || user.email?.split('@')[0];

    if (!name) return 'Foto de perfil';

    return `Foto de perfil de ${name}`;
  }
}
