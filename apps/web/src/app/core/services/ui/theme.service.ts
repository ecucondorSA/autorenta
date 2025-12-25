import { Injectable } from '@angular/core';

/**
 * ThemeService - Light mode only
 *
 * Dark mode has been removed. This service exists for backwards compatibility
 * with components that may still reference it.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  // Always light mode
  readonly themePreference = () => 'light' as const;
  readonly effectiveTheme = () => 'light' as const;
  readonly isDark = () => false;
  readonly systemPrefersDark = () => false;

  setTheme(): void {
    // No-op - always light mode
  }

  toggleTheme(): void {
    // No-op - always light mode
  }

  cycleTheme(): void {
    // No-op - always light mode
  }

  getThemeIcon(): string {
    return '';
  }

  getThemeLabel(): string {
    return 'Claro';
  }
}
