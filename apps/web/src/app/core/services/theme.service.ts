import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'autorenta-theme';

/**
 * ThemeService - Manages application theme (light/dark mode)
 *
 * Features:
 * - Persists user preference to localStorage
 * - Respects system preference when set to 'system'
 * - Provides reactive signals for theme state
 * - Handles class-based dark mode (Tailwind darkMode: 'class')
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // User's selected theme preference
  readonly themePreference = signal<ThemeMode>(this.loadThemePreference());

  // System's preferred color scheme
  readonly systemPrefersDark = signal<boolean>(this.getSystemPreference());

  // Computed: actual applied theme (resolves 'system' to actual value)
  readonly effectiveTheme = computed<'light' | 'dark'>(() => {
    const preference = this.themePreference();
    if (preference === 'system') {
      return this.systemPrefersDark() ? 'dark' : 'light';
    }
    return preference;
  });

  // Computed: is dark mode active?
  readonly isDark = computed(() => this.effectiveTheme() === 'dark');

  constructor() {
    if (this.isBrowser) {
      // Apply theme on init
      this.applyTheme(this.effectiveTheme());

      // Listen for system preference changes
      this.setupSystemPreferenceListener();

      // Effect to apply theme when it changes
      effect(() => {
        const theme = this.effectiveTheme();
        this.applyTheme(theme);
      });

      // Effect to persist preference
      effect(() => {
        const preference = this.themePreference();
        this.saveThemePreference(preference);
      });
    }
  }

  /**
   * Set theme preference
   */
  setTheme(mode: ThemeMode): void {
    this.themePreference.set(mode);
  }

  /**
   * Toggle between light and dark (ignores system)
   */
  toggleTheme(): void {
    const current = this.effectiveTheme();
    this.themePreference.set(current === 'dark' ? 'light' : 'dark');
  }

  /**
   * Cycle through modes: light -> dark -> system -> light
   */
  cycleTheme(): void {
    const current = this.themePreference();
    const next: ThemeMode = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
    this.themePreference.set(next);
  }

  /**
   * Get theme icon for current state
   */
  getThemeIcon(): string {
    const preference = this.themePreference();
    switch (preference) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'system':
        return '💻';
    }
  }

  /**
   * Get theme label for current state
   */
  getThemeLabel(): string {
    const preference = this.themePreference();
    switch (preference) {
      case 'light':
        return 'Claro';
      case 'dark':
        return 'Oscuro';
      case 'system':
        return 'Sistema';
    }
  }

  /**
   * Apply theme class to document
   */
  private applyTheme(theme: 'light' | 'dark'): void {
    if (!this.isBrowser) return;

    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#ffffff');
    }
  }

  /**
   * Load theme preference from localStorage
   */
  private loadThemePreference(): ThemeMode {
    if (!this.isBrowser) return 'light';

    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }

    // Default to light mode
    return 'light';
  }

  /**
   * Save theme preference to localStorage
   */
  private saveThemePreference(mode: ThemeMode): void {
    if (!this.isBrowser) return;
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }

  /**
   * Get system color scheme preference
   */
  private getSystemPreference(): boolean {
    if (!this.isBrowser) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Listen for system preference changes
   */
  private setupSystemPreferenceListener(): void {
    if (!this.isBrowser) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      this.systemPrefersDark.set(e.matches);
    });
  }
}
