import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RemoteConfigService } from './remote-config.service';
import { LoggerService } from './logger.service';

/**
 * Dynamic Design Tokens Service
 *
 * Gestiona tokens de diseño que pueden cambiar dinámicamente según:
 * - País/región del usuario
 * - Hora del día
 * - Preferencias del usuario
 * - Configuración remota
 * - Eventos especiales
 *
 * @example
 * ```typescript
 * // Aplicar tema según contexto
 * this.dynamicTokens.applyContextualTheme();
 *
 * // Aplicar tema de evento especial
 * this.dynamicTokens.applyEventTheme('black-friday');
 * ```
 */

export interface DesignTokens {
  // Colores primarios
  colorPrimary: string;
  colorPrimaryLight: string;
  colorPrimaryDark: string;
  colorSecondary: string;
  colorAccent: string;

  // Colores de estado
  colorSuccess: string;
  colorWarning: string;
  colorError: string;
  colorInfo: string;

  // Colores de superficie
  colorBackground: string;
  colorSurface: string;
  colorSurfaceVariant: string;

  // Colores de texto
  colorText: string;
  colorTextSecondary: string;
  colorTextMuted: string;

  // Espaciado
  spacingXs: string;
  spacingSm: string;
  spacingMd: string;
  spacingLg: string;
  spacingXl: string;

  // Bordes
  borderRadius: string;
  borderRadiusLg: string;
  borderRadiusFull: string;

  // Sombras
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;

  // Tipografía
  fontFamilyBase: string;
  fontFamilyHeading: string;
  fontSizeBase: string;

  // Animaciones
  transitionFast: string;
  transitionNormal: string;
  transitionSlow: string;
}

export type ThemeMode = 'light' | 'dark' | 'auto';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

interface ThemePreset {
  name: string;
  tokens: Partial<DesignTokens>;
}

@Injectable({ providedIn: 'root' })
export class DynamicTokensService {
  private readonly document = inject(DOCUMENT);
  private readonly remoteConfig = inject(RemoteConfigService);
  private readonly logger = inject(LoggerService);

  // Estado
  private readonly currentTheme = signal<string>('default');
  private readonly currentMode = signal<ThemeMode>('auto');
  private readonly customTokens = signal<Partial<DesignTokens>>({});

  // Selectores públicos
  readonly theme = computed(() => this.currentTheme());
  readonly mode = computed(() => this.currentMode());

  // Tokens base (light mode)
  private readonly baseTokens: DesignTokens = {
    // Colores primarios (naranja Autorentar)
    colorPrimary: '#f97316',
    colorPrimaryLight: '#fb923c',
    colorPrimaryDark: '#ea580c',
    colorSecondary: '#3b82f6',
    colorAccent: '#8b5cf6',

    // Estados
    colorSuccess: '#22c55e',
    colorWarning: '#eab308',
    colorError: '#ef4444',
    colorInfo: '#0ea5e9',

    // Superficies
    colorBackground: '#f8fafc',
    colorSurface: '#ffffff',
    colorSurfaceVariant: '#f1f5f9',

    // Texto
    colorText: '#0f172a',
    colorTextSecondary: '#475569',
    colorTextMuted: '#94a3b8',

    // Espaciado
    spacingXs: '0.25rem',
    spacingSm: '0.5rem',
    spacingMd: '1rem',
    spacingLg: '1.5rem',
    spacingXl: '2rem',

    // Bordes
    borderRadius: '0.5rem',
    borderRadiusLg: '1rem',
    borderRadiusFull: '9999px',

    // Sombras
    shadowSm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    shadowMd: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    shadowLg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',

    // Tipografía
    fontFamilyBase: "'Inter', system-ui, sans-serif",
    fontFamilyHeading: "'Inter', system-ui, sans-serif",
    fontSizeBase: '1rem',

    // Animaciones
    transitionFast: '150ms ease',
    transitionNormal: '300ms ease',
    transitionSlow: '500ms ease',
  };

  // Tokens para dark mode
  private readonly darkTokens: Partial<DesignTokens> = {
    colorBackground: '#0f172a',
    colorSurface: '#1e293b',
    colorSurfaceVariant: '#334155',
    colorText: '#f8fafc',
    colorTextSecondary: '#cbd5e1',
    colorTextMuted: '#64748b',
    shadowSm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
    shadowMd: '0 4px 6px -1px rgb(0 0 0 / 0.4)',
    shadowLg: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
  };

  // Temas por país
  private readonly countryThemes: Record<string, Partial<DesignTokens>> = {
    BR: {
      // Brasil - colores más cálidos
      colorPrimary: '#f97316',
      colorSecondary: '#22c55e',
    },
    AR: {
      // Argentina - azul celeste
      colorPrimary: '#0ea5e9',
      colorSecondary: '#f97316',
    },
    MX: {
      // México - verde/rojo
      colorPrimary: '#16a34a',
      colorAccent: '#dc2626',
    },
  };

  // Temas por hora del día
  private readonly timeThemes: Record<TimeOfDay, Partial<DesignTokens>> = {
    morning: {
      colorPrimary: '#f97316', // Naranja cálido
      colorBackground: '#fffbeb', // Tono cálido suave
    },
    afternoon: {
      colorPrimary: '#f97316',
      colorBackground: '#f8fafc',
    },
    evening: {
      colorPrimary: '#ea580c', // Naranja más profundo
      colorBackground: '#fef3c7',
    },
    night: {
      // Modo oscuro automático
      ...this.darkTokens,
      colorPrimary: '#fb923c',
    },
  };

  // Temas de eventos especiales
  private readonly eventThemes: Record<string, ThemePreset> = {
    'black-friday': {
      name: 'Black Friday',
      tokens: {
        colorPrimary: '#000000',
        colorSecondary: '#fbbf24',
        colorAccent: '#ef4444',
        colorBackground: '#18181b',
        colorSurface: '#27272a',
        colorText: '#fafafa',
      },
    },
    christmas: {
      name: 'Navidad',
      tokens: {
        colorPrimary: '#dc2626',
        colorSecondary: '#16a34a',
        colorAccent: '#fbbf24',
      },
    },
    'new-year': {
      name: 'Año Nuevo',
      tokens: {
        colorPrimary: '#fbbf24',
        colorSecondary: '#8b5cf6',
        colorAccent: '#ec4899',
      },
    },
    carnival: {
      name: 'Carnaval',
      tokens: {
        colorPrimary: '#8b5cf6',
        colorSecondary: '#ec4899',
        colorAccent: '#22d3ee',
      },
    },
    summer: {
      name: 'Verano',
      tokens: {
        colorPrimary: '#0ea5e9',
        colorSecondary: '#fbbf24',
        colorAccent: '#f97316',
      },
    },
  };

  constructor() {
    // Aplicar tema inicial
    this.applyContextualTheme();

    // Efecto para re-aplicar cuando cambien los tokens custom
    effect(() => {
      const custom = this.customTokens();
      if (Object.keys(custom).length > 0) {
        this.applyTokensToDOM({ ...this.getActiveTokens(), ...custom });
      }
    });
  }

  /**
   * Aplica tema basado en contexto (hora, país, preferencias)
   */
  applyContextualTheme(): void {
    const tokens = this.getActiveTokens();

    // Aplicar variaciones por hora
    const timeOfDay = this.getTimeOfDay();
    const timeTokens = this.timeThemes[timeOfDay];

    // Aplicar variaciones por país (desde remote config)
    const country = this.remoteConfig.getString('USER_COUNTRY', 'BR');
    const countryTokens = this.countryThemes[country] || {};

    // Combinar tokens
    const finalTokens = {
      ...tokens,
      ...countryTokens,
      ...(this.shouldUseDarkMode() ? this.darkTokens : {}),
      ...(timeOfDay === 'night' ? timeTokens : {}),
    };

    this.applyTokensToDOM(finalTokens);
    this.currentTheme.set('contextual');
    this.logger.debug('Applied contextual theme', { timeOfDay, country });
  }

  /**
   * Aplica tema de evento especial
   */
  applyEventTheme(eventId: string): void {
    const event = this.eventThemes[eventId];
    if (!event) {
      this.logger.warn('Unknown event theme', { eventId });
      return;
    }

    const tokens = { ...this.getActiveTokens(), ...event.tokens };
    this.applyTokensToDOM(tokens);
    this.currentTheme.set(eventId);
    this.logger.debug('Applied event theme', { eventId, name: event.name });
  }

  /**
   * Aplica modo oscuro/claro
   */
  setMode(mode: ThemeMode): void {
    this.currentMode.set(mode);

    if (mode === 'dark' || (mode === 'auto' && this.shouldUseDarkMode())) {
      this.applyTokensToDOM({ ...this.baseTokens, ...this.darkTokens });
    } else {
      this.applyTokensToDOM(this.baseTokens);
    }
  }

  /**
   * Aplica tokens personalizados (override temporal)
   */
  setCustomTokens(tokens: Partial<DesignTokens>): void {
    this.customTokens.set(tokens);
  }

  /**
   * Resetea a tokens por defecto
   */
  resetToDefault(): void {
    this.customTokens.set({});
    this.applyTokensToDOM(this.baseTokens);
    this.currentTheme.set('default');
  }

  /**
   * Obtiene el valor actual de un token
   */
  getToken<K extends keyof DesignTokens>(key: K): DesignTokens[K] {
    const custom = this.customTokens();
    return (custom[key] as DesignTokens[K]) || this.baseTokens[key];
  }

  /**
   * Obtiene todos los tokens activos
   */
  getActiveTokens(): DesignTokens {
    return { ...this.baseTokens, ...this.customTokens() };
  }

  // ============================================
  // Helpers privados
  // ============================================

  private applyTokensToDOM(tokens: Partial<DesignTokens>): void {
    const root = this.document.documentElement;

    // Mapear tokens a variables CSS
    const cssVarMap: Record<keyof DesignTokens, string> = {
      colorPrimary: '--color-primary',
      colorPrimaryLight: '--color-primary-light',
      colorPrimaryDark: '--color-primary-dark',
      colorSecondary: '--color-secondary',
      colorAccent: '--color-accent',
      colorSuccess: '--color-success',
      colorWarning: '--color-warning',
      colorError: '--color-error',
      colorInfo: '--color-info',
      colorBackground: '--color-background',
      colorSurface: '--color-surface',
      colorSurfaceVariant: '--color-surface-variant',
      colorText: '--color-text',
      colorTextSecondary: '--color-text-secondary',
      colorTextMuted: '--color-text-muted',
      spacingXs: '--spacing-xs',
      spacingSm: '--spacing-sm',
      spacingMd: '--spacing-md',
      spacingLg: '--spacing-lg',
      spacingXl: '--spacing-xl',
      borderRadius: '--border-radius',
      borderRadiusLg: '--border-radius-lg',
      borderRadiusFull: '--border-radius-full',
      shadowSm: '--shadow-sm',
      shadowMd: '--shadow-md',
      shadowLg: '--shadow-lg',
      fontFamilyBase: '--font-family-base',
      fontFamilyHeading: '--font-family-heading',
      fontSizeBase: '--font-size-base',
      transitionFast: '--transition-fast',
      transitionNormal: '--transition-normal',
      transitionSlow: '--transition-slow',
    };

    for (const [key, value] of Object.entries(tokens)) {
      const cssVar = cssVarMap[key as keyof DesignTokens];
      if (cssVar && value) {
        root.style.setProperty(cssVar, value);
      }
    }
  }

  private getTimeOfDay(): TimeOfDay {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 21) return 'evening';
    return 'night';
  }

  private shouldUseDarkMode(): boolean {
    const mode = this.currentMode();
    if (mode === 'dark') return true;
    if (mode === 'light') return false;

    // Auto: usar preferencia del sistema
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }
}
