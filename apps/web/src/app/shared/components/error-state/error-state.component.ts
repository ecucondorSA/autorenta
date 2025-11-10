import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * 🚨 Error State Component
 *
 * Componente reutilizable para mostrar estados de error consistentes.
 * Mejora la comunicación de errores al usuario.
 *
 * @example
 * <app-error-state
 *   title="Error al cargar"
 *   message="No pudimos cargar los datos"
 *   [retryable]="true"
 *   (retry)="handleRetry()">
 * </app-error-state>
 */
@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-state-container">
      <!-- Error Icon -->
      <div class="error-icon-wrapper">
        <svg
          class="error-icon"
          [class.error-icon-critical]="type === 'critical'"
          [class.error-icon-warning]="type === 'warning'"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            *ngIf="type === 'critical'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <path
            *ngIf="type === 'warning'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <!-- Title -->
      <h3 class="error-title">{{ title }}</h3>

      <!-- Message -->
      <p class="error-message">{{ message }}</p>

      <!-- Details (optional) -->
      <details *ngIf="details" class="error-details">
        <summary class="error-details-summary">Ver detalles técnicos</summary>
        <pre class="error-details-content">{{ details }}</pre>
      </details>

      <!-- Actions -->
      <div class="error-actions">
        <button
          *ngIf="retryable"
          (click)="retry.emit()"
          type="button"
          class="btn-retry"
        >
          <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {{ retryText }}
        </button>

        <button
          *ngIf="dismissible"
          (click)="dismiss.emit()"
          type="button"
          class="btn-dismiss"
        >
          Cerrar
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .error-state-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        text-align: center;
        min-height: 300px;
      }

      .error-icon-wrapper {
        margin-bottom: 1rem;
      }

      .error-icon {
        width: 4rem;
        height: 4rem;
        color: #ef4444;
      }

      .error-icon-critical {
        color: #dc2626;
      }

      .error-icon-warning {
        color: #f59e0b;
      }

      .error-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #111827;
        margin-bottom: 0.5rem;
      }

      :host-context(.dark) .error-title {
        color: #f9fafb;
      }

      .error-message {
        font-size: 0.875rem;
        color: #6b7280;
        margin-bottom: 1.5rem;
        max-width: 32rem;
      }

      :host-context(.dark) .error-message {
        color: #9ca3af;
      }

      .error-details {
        width: 100%;
        max-width: 40rem;
        margin-bottom: 1.5rem;
        border-radius: 0.5rem;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
      }

      :host-context(.dark) .error-details {
        background: #1f2937;
        border-color: #374151;
      }

      .error-details-summary {
        padding: 0.75rem 1rem;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        user-select: none;
      }

      :host-context(.dark) .error-details-summary {
        color: #d1d5db;
      }

      .error-details-summary:hover {
        background: #f3f4f6;
      }

      :host-context(.dark) .error-details-summary:hover {
        background: #111827;
      }

      .error-details-content {
        padding: 0.75rem 1rem;
        font-family: 'Courier New', monospace;
        font-size: 0.75rem;
        color: #dc2626;
        background: #fef2f2;
        border-top: 1px solid #e5e7eb;
        margin: 0;
        overflow-x: auto;
      }

      :host-context(.dark) .error-details-content {
        background: #1f2937;
        color: #f87171;
        border-top-color: #374151;
      }

      .error-actions {
        display: flex;
        gap: 0.75rem;
      }

      .btn-retry,
      .btn-dismiss {
        padding: 0.625rem 1.25rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }

      .btn-retry {
        background: #3b82f6;
        color: white;
      }

      .btn-retry:hover {
        background: #2563eb;
      }

      .btn-dismiss {
        background: #f3f4f6;
        color: #374151;
      }

      :host-context(.dark) .btn-dismiss {
        background: #374151;
        color: #d1d5db;
      }

      .btn-dismiss:hover {
        background: #e5e7eb;
      }

      :host-context(.dark) .btn-dismiss:hover {
        background: #4b5563;
      }

      .btn-icon {
        width: 1.25rem;
        height: 1.25rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
  @Input() title = 'Error';
  @Input() message = 'Algo salió mal. Intentá de nuevo.';
  @Input() details?: string;
  @Input() type: 'critical' | 'warning' = 'critical';
  @Input() retryable = true;
  @Input() retryText = 'Reintentar';
  @Input() dismissible = false;

  @Output() retry = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();
}
