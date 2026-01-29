import { LoggerService } from '@core/services/infrastructure/logger.service';
import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { environment } from '@environment';

import { IconComponent } from '../icon/icon.component';

interface FooterSection {
  title: string;
  links: FooterLink[];
}

interface FooterLink {
  label: string;
  url: string;
  external?: boolean;
}

/**
 * FooterComponent - Professional footer similar to Airbnb
 *
 * Features:
 * - Multi-column layout with organized sections
 * - Responsive design (mobile-first)
 * - Social media links
 * - Language and currency selectors
 * - Copyright and legal links
 * - Dark mode support
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgOptimizedImage, IconComponent],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
})
export class FooterComponent {
  private readonly logger = inject(LoggerService);
  currentYear = new Date().getFullYear();

  // Footer sections
  sections = signal<FooterSection[]>([
    {
      title: 'Soporte',
      links: [
        { label: 'Centro de ayuda', url: '/help' },
        { label: 'AirCover', url: '/aircover' },
        { label: 'Seguridad', url: '/safety' },
        { label: 'Opciones de cancelación', url: '/cancellation' },
        { label: 'Atención al cliente', url: '/support' },
      ],
    },
    {
      title: 'Comunidad',
      links: [
        { label: 'Foro de la comunidad', url: '/community' },
        { label: 'Alquila tu auto', url: '/rent-your-car' },
        { label: 'Recursos para propietarios', url: '/owner-resources' },
        { label: 'Centro de recursos', url: '/resources' },
      ],
    },
    {
      title: 'Autorentar',
      links: [
        { label: 'Novedades', url: '/newsroom' },
        { label: 'Sobre nosotros', url: '/about' },
        { label: 'Empleo', url: '/careers' },
        { label: 'Inversionistas', url: '/investors' },
        { label: 'Blog', url: '/blog', external: true },
      ],
    },
  ]);

  socialLinks = signal([
    {
      name: 'Facebook',
      icon: 'facebook',
      url: environment.socialMedia.facebook,
      ariaLabel: 'Síguenos en Facebook',
    },
    {
      name: 'Instagram',
      icon: 'instagram',
      url: environment.socialMedia.instagram,
      ariaLabel: 'Síguenos en Instagram',
    },
    {
      name: 'TikTok',
      icon: 'tiktok',
      url: environment.socialMedia.tiktok,
      ariaLabel: 'Síguenos en TikTok',
    },
    {
      name: 'YouTube',
      icon: 'youtube',
      url: environment.socialMedia.youtube,
      ariaLabel: 'Suscríbete en YouTube',
    },
    {
      name: 'LinkedIn',
      icon: 'linkedin',
      url: environment.socialMedia.linkedin,
      ariaLabel: 'Síguenos en LinkedIn',
    },
  ]);

  // App store links
  appStoreUrl = 'https://apps.apple.com/app/autorentar';
  playStoreUrl = 'https://play.google.com/store/apps/details?id=com.autorentar.app';

  legalLinks = signal([
    { label: 'Privacidad', url: '/privacy' },
    { label: 'Términos', url: '/terms' },
    { label: 'Mapa del sitio', url: '/sitemap' },
    { label: 'Datos de la empresa', url: '/company-data' },
  ]);

  // Language and currency (these would typically be handled by a service)
  currentLanguage = signal('Español (AR)');
  currentCurrency = signal('USD');

  onLanguageChange(): void {
    // TODO: Implement language selector
    this.logger.debug('Language selector clicked');
  }

  onCurrencyChange(): void {
    // TODO: Implement currency selector
    this.logger.debug('Currency selector clicked');
  }
}
