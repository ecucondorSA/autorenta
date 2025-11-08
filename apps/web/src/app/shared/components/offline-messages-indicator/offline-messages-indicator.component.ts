import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineMessagesService } from '../../../core/services/offline-messages.service';
import { OfflineMessagesPanelComponent } from '../offline-messages-panel/offline-messages-panel.component';

/**
 * 🔴 Indicador de mensajes offline pendientes
 * Muestra un badge cuando hay mensajes en cola
 */
@Component({
  selector: 'app-offline-messages-indicator',
  standalone: true,
  imports: [CommonModule, OfflineMessagesPanelComponent],
  template: `
    @if (pendingCount() > 0) {
      <button
        (click)="showPanel.set(true)"
        class="relative flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-800 transition-colors hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-200 dark:hover:bg-yellow-900/30"
        type="button"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span
          >{{ pendingCount() }} mensaje{{ pendingCount() > 1 ? 's' : '' }} pendiente{{
            pendingCount() > 1 ? 's' : ''
          }}</span
        >
        <span
          class="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs font-bold text-white"
        >
          {{ pendingCount() }}
        </span>
      </button>
    }

    @if (showPanel()) {
      <app-offline-messages-panel (close)="showPanel.set(false)" />
    }
  `,
})
export class OfflineMessagesIndicatorComponent implements OnInit, OnDestroy {
  private readonly offlineMessages = inject(OfflineMessagesService);

  readonly pendingCount = this.offlineMessages.pendingCount;
  readonly showPanel = signal(false);
  private refreshInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    // Refresh count periodically when there are pending messages
    this.refreshInterval = setInterval(() => {
      if (this.pendingCount() > 0) {
        this.offlineMessages.getPendingMessages().catch(() => {
          // Silently fail
        });
      }
    }, 5000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}
