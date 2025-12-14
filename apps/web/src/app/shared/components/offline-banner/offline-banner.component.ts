import {Component, inject,
  ChangeDetectionStrategy} from '@angular/core';

import { OfflineManagerService } from '../../../core/services/offline-manager.service';

/**
 * P1-024 FIX: Offline Banner Component
 *
 * Shows a persistent banner when user is offline
 * Displays queued mutations count
 *
 * Usage:
 * Add to app.component.html:
 * <app-offline-banner />
 */
@Component({
  selector: 'app-offline-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    @if (offlineManager.isOffline()) {
      <div class="offline-banner" role="alert" aria-live="assertive">
        <div class="offline-content">
          <svg class="offline-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
          <div class="offline-text">
            <span class="offline-title">Sin conexión</span>
            @if (offlineManager.queuedMutations().length > 0) {
              <span class="offline-subtitle">
                {{ offlineManager.queuedMutations().length }} cambio(s) pendiente(s)
              </span>
            } @else {
              <span class="offline-subtitle">Algunas funciones no están disponibles</span>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .offline-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 50;
        background: var(--error-default); /* Reemplazado gradiente con color sólido */
        color: white;
        padding: 0.75rem 1rem;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        animation: slideDown 0.3s ease-out;
      }

      @keyframes slideDown {
        from {
          transform: translateY(-100%);
        }
        to {
          transform: translateY(0);
        }
      }

      .offline-content {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .offline-icon {
        width: 1.5rem;
        height: 1.5rem;
        flex-shrink: 0;
        animation: pulse 2s ease-in-out infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.6;
        }
      }

      .offline-text {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }

      .offline-title {
        font-weight: 600;
        font-size: 0.875rem;
        line-height: 1.2;
      }

      .offline-subtitle {
        font-size: 0.75rem;
        opacity: 0.9;
        line-height: 1.2;
      }

      @media (min-width: 768px) {
        .offline-banner {
          padding: 0.5rem 1rem;
        }

        .offline-content {
          justify-content: center;
        }

        .offline-text {
          flex-direction: row;
          align-items: center;
          gap: 0.5rem;
        }

        .offline-subtitle::before {
          content: '•';
          margin-right: 0.5rem;
        }
      }
    `,
  ],
})
export class OfflineBannerComponent {
  readonly offlineManager = inject(OfflineManagerService);
}
