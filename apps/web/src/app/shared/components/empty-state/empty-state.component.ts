import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * 📭 Empty State Component
 *
 * Componente reutilizable para mostrar estados vacíos consistentes.
 * Mejora la UX cuando no hay datos para mostrar.
 *
 * @example
 * <app-empty-state
 *   icon="inbox"
 *   title="No hay mensajes"
 *   message="Cuando alguien te escriba, aparecerá aquí"
 *   actionText="Explorar autos"
 *   (action)="goToCars()">
 * </app-empty-state>
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state-container">
      <!-- Icon -->
      <div class="empty-icon-wrapper">
        <svg
          class="empty-icon"
          [class.empty-icon-primary]="iconColor === 'primary'"
          [class.empty-icon-secondary]="iconColor === 'secondary'"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <!-- Inbox Icon -->
          <path
            *ngIf="icon === 'inbox'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />

          <!-- Search Icon -->
          <path
            *ngIf="icon === 'search'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />

          <!-- Folder Icon -->
          <path
            *ngIf="icon === 'folder'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />

          <!-- List Icon -->
          <path
            *ngIf="icon === 'list'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />

          <!-- Car Icon -->
          <path
            *ngIf="icon === 'car'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 7h8M5 10h14l-3 9H8l-3-9zM6 15h1m8 0h1"
          />

          <!-- Wallet Icon -->
          <path
            *ngIf="icon === 'wallet'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />

          <!-- Chart Icon -->
          <path
            *ngIf="icon === 'chart'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>

      <!-- Title -->
      <h3 class="empty-title">{{ title }}</h3>

      <!-- Message -->
      <p class="empty-message">{{ message }}</p>

      <!-- Action Button (optional) -->
      <button
        *ngIf="actionText"
        (click)="action.emit()"
        type="button"
        class="empty-action-btn"
      >
        {{ actionText }}
      </button>
    </div>
  `,
  styles: [
    `
      .empty-state-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1.5rem;
        text-align: center;
        min-height: 300px;
      }

      .empty-icon-wrapper {
        margin-bottom: 1.5rem;
        padding: 1rem;
        border-radius: 50%;
        background: #f3f4f6;
      }

      :host-context(.dark) .empty-icon-wrapper {
        background: #374151;
      }

      .empty-icon {
        width: 3rem;
        height: 3rem;
        color: #9ca3af;
      }

      .empty-icon-primary {
        color: #3b82f6;
      }

      .empty-icon-secondary {
        color: #8b5cf6;
      }

      :host-context(.dark) .empty-icon {
        color: #6b7280;
      }

      .empty-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #111827;
        margin-bottom: 0.5rem;
      }

      :host-context(.dark) .empty-title {
        color: #f9fafb;
      }

      .empty-message {
        font-size: 0.875rem;
        color: #6b7280;
        margin-bottom: 1.5rem;
        max-width: 24rem;
        line-height: 1.5;
      }

      :host-context(.dark) .empty-message {
        color: #9ca3af;
      }

      .empty-action-btn {
        padding: 0.625rem 1.5rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        background: #3b82f6;
        color: white;
        border: none;
        cursor: pointer;
        transition: background 0.2s;
      }

      .empty-action-btn:hover {
        background: #2563eb;
      }

      .empty-action-btn:active {
        background: #1d4ed8;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  @Input() icon: 'inbox' | 'search' | 'folder' | 'list' | 'car' | 'wallet' | 'chart' = 'inbox';
  @Input() iconColor: 'default' | 'primary' | 'secondary' = 'default';
  @Input() title = 'No hay datos';
  @Input() message = 'Cuando haya información disponible, aparecerá aquí';
  @Input() actionText?: string;

  @Output() action = new EventEmitter<void>();
}
