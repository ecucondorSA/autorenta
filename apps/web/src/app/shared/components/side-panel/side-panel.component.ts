import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

/**
 * SidePanelComponent
 *
 * A sliding side panel that pushes content from the right.
 * NOT a modal - it's a drawer that coexists with page content.
 *
 * Usage:
 * ```html
 * <app-side-panel
 *   [isOpen]="chatPanelOpen()"
 *   [title]="'Chat con ' + ownerName"
 *   (closed)="chatPanelOpen.set(false)">
 *   <ng-content></ng-content>
 * </app-side-panel>
 * ```
 */
@Component({
  selector: 'app-side-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Backdrop (clickable to close) -->
    @if (isOpen) {
      <div
        class="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
        (click)="close()"
        [class.animate-fade-in]="isOpen"
      ></div>
    }

    <!-- Side Panel -->
    <div
      class="fixed top-0 right-0 h-full z-50 flex flex-col bg-surface-base border-l border-border-default shadow-2xl transition-transform duration-300 ease-out"
      [class.translate-x-0]="isOpen"
      [class.translate-x-full]="!isOpen"
      [style.width]="width"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface-raised"
      >
        <h2 class="text-base font-semibold text-text-primary truncate">
          {{ title }}
        </h2>
        <button
          type="button"
          (click)="close()"
          class="p-2 -mr-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          aria-label="Cerrar panel"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 flex flex-col min-h-0">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .animate-fade-in {
        animation: fadeIn 200ms ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ],
})
export class SidePanelComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() width = '400px';

  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}
