import {Component, inject, signal, computed, HostListener,
  ChangeDetectionStrategy} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { DebugService, DebugLogEntry } from '../../../core/services/debug.service';

/**
 * DebugPanelComponent - Floating debug panel for AutoRenta
 *
 * Features:
 * - Real-time log viewer with color-coded levels
 * - Filter by level (DEBUG, INFO, WARN, ERROR, CRITICAL)
 * - Search by message or context
 * - Export logs (download/clipboard)
 * - Session info display
 * - Draggable and resizable
 *
 * Activation:
 * - URL param: ?debug=1
 * - Triple tap on screen corner
 * - Keyboard: Ctrl+Shift+D
 */
@Component({
  selector: 'app-debug-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <!-- Floating Toggle Button -->
    @if (debugService.isEnabled()) {
      <button
        (click)="debugService.togglePanel()"
        class="fixed bottom-20 right-4 z-[9999] w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all"
        [class]="debugService.isPanelOpen() ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-500 hover:bg-primary-600'"
        [title]="debugService.isPanelOpen() ? 'Close Debug Panel' : 'Open Debug Panel'"
      >
        @if (debugService.isPanelOpen()) {
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        } @else {
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
          </svg>
        }
        <!-- Badge with error count -->
        @if (!debugService.isPanelOpen() && debugService.errorCount() > 0) {
          <span class="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {{ debugService.errorCount() > 9 ? '9+' : debugService.errorCount() }}
          </span>
        }
      </button>
    }

    <!-- Debug Panel -->
    @if (debugService.isEnabled() && debugService.isPanelOpen()) {
      <div
        class="fixed bottom-0 left-0 right-0 z-[9998] bg-gray-900 text-white shadow-2xl flex flex-col"
        [style.height]="panelHeight() + 'px'"
      >
        <!-- Resize Handle -->
        <div
          class="h-1 bg-gray-700 hover:bg-primary-500 cursor-ns-resize"
          (mousedown)="startResize($event)"
        ></div>

        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div class="flex items-center gap-3">
            <span class="text-lg font-bold text-primary-400">Debug Panel</span>
            <span class="text-xs text-gray-400">{{ debugService.logs().length }} logs</span>
            @if (debugService.errorCount() > 0) {
              <span class="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">
                {{ debugService.errorCount() }} errors
              </span>
            }
            @if (debugService.warnCount() > 0) {
              <span class="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded-full">
                {{ debugService.warnCount() }} warnings
              </span>
            }
          </div>

          <div class="flex items-center gap-2">
            <!-- Level Filter -->
            <select
              [(ngModel)]="levelFilter"
              class="bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-primary-500"
            >
              <option value="">All Levels</option>
              <option value="DEBUG">DEBUG</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>

            <!-- Search -->
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search..."
              class="bg-gray-700 text-white text-sm px-3 py-1 rounded border border-gray-600 focus:outline-none focus:border-primary-500 w-40"
            />

            <!-- Actions -->
            <button
              (click)="debugService.clearLogs()"
              class="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              title="Clear Logs"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
            <button
              (click)="debugService.copyLogsToClipboard()"
              class="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              title="Copy to Clipboard"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
              </svg>
            </button>
            <button
              (click)="debugService.downloadLogs()"
              class="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              title="Download Logs"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
            </button>
            <button
              (click)="showInfo = !showInfo"
              class="p-1.5 hover:bg-gray-700 rounded"
              [class]="showInfo ? 'text-primary-400' : 'text-gray-400 hover:text-white'"
              title="Session Info"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </button>
            <button
              (click)="debugService.closePanel()"
              class="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              title="Close Panel"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Session Info (Collapsible) -->
        @if (showInfo) {
          <div class="px-4 py-2 bg-gray-800 border-b border-gray-700 text-xs font-mono">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div><span class="text-gray-500">Platform:</span> {{ debugService.sessionInfo.platform }}</div>
              <div><span class="text-gray-500">Screen:</span> {{ debugService.sessionInfo.screenSize }}</div>
              <div><span class="text-gray-500">Language:</span> {{ debugService.sessionInfo.language }}</div>
              <div><span class="text-gray-500">Env:</span> {{ debugService.sessionInfo.environment }}</div>
            </div>
          </div>
        }

        <!-- Logs Container -->
        <div
          #logsContainer
          class="flex-1 overflow-y-auto font-mono text-xs"
          (scroll)="onScroll()"
        >
          @for (log of filteredLogs(); track log.id) {
            <div
              class="px-4 py-1 hover:bg-gray-800 border-b border-gray-800 flex items-start gap-2"
              [class]="getLogRowClass(log)"
            >
              <!-- Timestamp -->
              <span class="text-gray-500 shrink-0">
                {{ formatTime(log.timestamp) }}
              </span>

              <!-- Level Badge -->
              <span
                class="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0"
                [class]="getLevelBadgeClass(log.level)"
              >
                {{ log.level }}
              </span>

              <!-- Context -->
              <span class="text-purple-400 shrink-0">[{{ log.context }}]</span>

              <!-- Message -->
              <span class="text-gray-200 flex-1">{{ log.message }}</span>

              <!-- Data -->
              @if (log.data) {
                <button
                  (click)="toggleLogData(log.id)"
                  class="text-gray-500 hover:text-white shrink-0"
                >
                  {{ expandedLogs.has(log.id) ? '[-]' : '[+]' }}
                </button>
              }
            </div>

            <!-- Expanded Data -->
            @if (log.data && expandedLogs.has(log.id)) {
              <div class="px-4 py-2 bg-gray-950 border-b border-gray-800 ml-8">
                <pre class="text-xs text-gray-400 whitespace-pre-wrap">{{ formatData(log.data) }}</pre>
              </div>
            }
          } @empty {
            <div class="flex items-center justify-center h-full text-gray-500">
              No logs to display
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="px-4 py-1 bg-gray-800 border-t border-gray-700 text-xs text-gray-500 flex items-center justify-between">
          <span>AutoRenta Debug v1.0 | Ctrl+Shift+D to toggle</span>
          <span>{{ autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF' }}</span>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    }
  `]
})
export class DebugPanelComponent {
  protected readonly debugService = inject(DebugService);

  // UI State
  levelFilter = '';
  searchQuery = '';
  showInfo = false;
  autoScroll = true;
  expandedLogs = new Set<number>();

  // Panel height (resizable)
  panelHeight = signal(300);
  private isResizing = false;
  private startY = 0;
  private startHeight = 0;

  // Triple tap detection
  private tapCount = 0;
  private lastTapTime = 0;

  /**
   * Filtered logs based on level and search
   */
  filteredLogs = computed(() => {
    let logs = this.debugService.logs();

    if (this.levelFilter) {
      logs = logs.filter(l => l.level === this.levelFilter);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      logs = logs.filter(l =>
        l.message.toLowerCase().includes(q) ||
        l.context.toLowerCase().includes(q)
      );
    }

    return logs;
  });

  /**
   * Keyboard shortcut: Ctrl+Shift+D
   */
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.shiftKey && event.key === 'D') {
      event.preventDefault();
      if (!this.debugService.isEnabled()) {
        this.debugService.enable();
      }
      this.debugService.togglePanel();
    }
  }

  /**
   * Triple tap detection for mobile
   */
  @HostListener('document:touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    const now = Date.now();

    // Check if tap is in corner (top-right)
    if (touch.clientX > window.innerWidth - 60 && touch.clientY < 60) {
      if (now - this.lastTapTime < 500) {
        this.tapCount++;
        if (this.tapCount >= 3) {
          if (!this.debugService.isEnabled()) {
            this.debugService.enable();
          }
          this.debugService.togglePanel();
          this.tapCount = 0;
        }
      } else {
        this.tapCount = 1;
      }
      this.lastTapTime = now;
    }
  }

  /**
   * Start resizing panel
   */
  startResize(event: MouseEvent): void {
    this.isResizing = true;
    this.startY = event.clientY;
    this.startHeight = this.panelHeight();
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isResizing) return;

    const diff = this.startY - event.clientY;
    const newHeight = Math.max(200, Math.min(window.innerHeight - 100, this.startHeight + diff));
    this.panelHeight.set(newHeight);
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isResizing = false;
  }

  /**
   * Handle scroll for auto-scroll toggle
   */
  onScroll(): void {
    // Disable auto-scroll when user scrolls up
  }

  /**
   * Toggle log data expansion
   */
  toggleLogData(id: number): void {
    if (this.expandedLogs.has(id)) {
      this.expandedLogs.delete(id);
    } else {
      this.expandedLogs.add(id);
    }
  }

  /**
   * Format timestamp for display
   */
  formatTime(date: Date): string {
    return date.toISOString().substring(11, 23);
  }

  /**
   * Format data for display
   */
  formatData(data: unknown): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  /**
   * Get CSS class for log row
   */
  getLogRowClass(log: DebugLogEntry): string {
    switch (log.level) {
      case 'ERROR':
      case 'CRITICAL':
        return 'bg-red-900/20';
      case 'WARN':
        return 'bg-yellow-900/20';
      default:
        return '';
    }
  }

  /**
   * Get CSS class for level badge
   */
  getLevelBadgeClass(level: string): string {
    const classes: Record<string, string> = {
      'DEBUG': 'bg-gray-600 text-gray-200',
      'INFO': 'bg-blue-600 text-white',
      'WARN': 'bg-yellow-600 text-white',
      'ERROR': 'bg-red-600 text-white',
      'CRITICAL': 'bg-red-800 text-white animate-pulse',
    };
    return classes[level] || 'bg-gray-600 text-gray-200';
  }
}
