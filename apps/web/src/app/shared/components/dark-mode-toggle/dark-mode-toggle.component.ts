import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';

/**
 * DarkModeToggleComponent - Theme toggle button
 *
 * Features:
 * - Cycles through light/dark/system modes
 * - Animated icon transitions
 * - Accessible with keyboard
 * - Shows current mode tooltip
 */
@Component({
  selector: 'app-dark-mode-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="theme-toggle"
      [attr.aria-label]="'Cambiar tema. Actual: ' + theme.getThemeLabel()"
      [title]="'Tema: ' + theme.getThemeLabel()"
      (click)="theme.cycleTheme()"
    >
      <span class="icon-container">
        <!-- Sun icon -->
        <svg
          class="icon sun"
          [class.active]="theme.themePreference() === 'light'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>

        <!-- Moon icon -->
        <svg
          class="icon moon"
          [class.active]="theme.themePreference() === 'dark'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>

        <!-- System icon -->
        <svg
          class="icon system"
          [class.active]="theme.themePreference() === 'system'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </span>
    </button>
  `,
  styles: [
    `
      .theme-toggle {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-secondary);
        background: var(--bg-primary);
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
          border-color: var(--border-primary);
        }

        &:focus-visible {
          outline: 2px solid var(--primary-500);
          outline-offset: 2px;
        }

        :host-context(.dark) & {
          background: var(--bg-secondary);
          border-color: var(--border-primary);
        }
      }

      .icon-container {
        position: relative;
        width: 20px;
        height: 20px;
      }

      .icon {
        position: absolute;
        top: 0;
        left: 0;
        width: 20px;
        height: 20px;
        opacity: 0;
        transform: scale(0.8) rotate(-30deg);
        transition:
          opacity 0.3s ease,
          transform 0.3s ease;

        &.active {
          opacity: 1;
          transform: scale(1) rotate(0);
        }
      }

      /* Alternative simple toggle style */
      :host(.simple) {
        .theme-toggle {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;

          &:hover {
            background: var(--bg-secondary);
          }
        }

        .icon-container {
          width: 18px;
          height: 18px;
        }

        .icon {
          width: 18px;
          height: 18px;
        }
      }

      /* Pill style with label */
      :host(.pill) {
        .theme-toggle {
          width: auto;
          height: auto;
          padding: var(--space-2) var(--space-3);
          gap: var(--space-2);
          border-radius: var(--radius-full);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DarkModeToggleComponent {
  readonly theme = inject(ThemeService);
}
