import {Component, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

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
  imports: [CommonModule, RouterLink, NgOptimizedImage],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
})
export class FooterComponent {
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
      icon: '📘',
      url: 'https://facebook.com/autorenta',
      ariaLabel: 'Visita nuestro Facebook',
    },
    {
      name: 'Twitter',
      icon: '🐦',
      url: 'https://twitter.com/autorenta',
      ariaLabel: 'Visita nuestro Twitter',
    },
    {
      name: 'Instagram',
      icon: '📷',
      url: 'https://instagram.com/autorenta',
      ariaLabel: 'Visita nuestro Instagram',
    },
  ]);

  legalLinks = signal([
    { label: 'Privacidad', url: '/privacy' },
    { label: 'Términos', url: '/terms' },
    { label: 'Mapa del sitio', url: '/sitemap' },
    { label: 'Datos de la empresa', url: '/company-data' },
  ]);

  // Language and currency (these would typically be handled by a service)
  currentLanguage = signal('Español (AR)');
  currentCurrency = signal('ARS');

  onLanguageChange(): void {
    // TODO: Implement language selector
    console.log('Language selector clicked');
  }

  onCurrencyChange(): void {
    // TODO: Implement currency selector
    console.log('Currency selector clicked');
  }
}
