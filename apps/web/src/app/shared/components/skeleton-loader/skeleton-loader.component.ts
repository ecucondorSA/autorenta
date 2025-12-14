import { Component, Input, ChangeDetectionStrategy } from '@angular/core';


type SkeletonType = 'text' | 'circle' | 'rect' | 'card' | 'list' | 'conversation' | 'table';

/**
 * 💀 Skeleton Loader Component
 *
 * Componente reutilizable para mostrar placeholders mientras carga contenido.
 * Mejora la percepción de performance y UX.
 *
 * @example
 * <app-skeleton-loader type="card"></app-skeleton-loader>
 * <app-skeleton-loader type="text" [count]="3"></app-skeleton-loader>
 */
@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [],
  template: `
    <div class="skeleton-wrapper">
      <!-- Card Skeleton -->
      @if (type === 'card') {
        <div class="skeleton-card">
          <div class="skeleton-image"></div>
          <div class="skeleton-content">
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-text"></div>
            <div class="skeleton-line skeleton-text short"></div>
          </div>
        </div>
      }
    
      <!-- Text Skeleton -->
      @if (type === 'text') {
        <div class="skeleton-text-wrapper">
          @for (_ of counter; track _) {
            <div class="skeleton-line"></div>
          }
        </div>
      }
    
      <!-- Circle Skeleton (para avatares) -->
      @if (type === 'circle') {
        <div class="skeleton-circle"></div>
      }
    
      <!-- Rectangle Skeleton -->
      @if (type === 'rect') {
        <div
          class="skeleton-rect"
          [style.width.px]="width"
          [style.height.px]="height"
        ></div>
      }
    
      <!-- List Skeleton (para listas de items) -->
      @if (type === 'list') {
        <div class="skeleton-list">
          @for (_ of counter; track _) {
            <div class="skeleton-list-item">
              <div class="skeleton-circle small"></div>
              <div class="skeleton-list-content">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-text short"></div>
              </div>
            </div>
          }
        </div>
      }
    
      <!-- Conversation Skeleton (para lista de conversaciones) -->
      @if (type === 'conversation') {
        <div class="skeleton-conversation">
          @for (_ of counter; track _) {
            <div class="skeleton-conversation-item">
              <div class="skeleton-circle"></div>
              <div class="skeleton-conversation-content">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-text"></div>
                <div class="skeleton-line skeleton-text short"></div>
              </div>
            </div>
          }
        </div>
      }
    
      <!-- Table Skeleton (para tablas) -->
      @if (type === 'table') {
        <div class="skeleton-table">
          <div class="skeleton-table-header">
            <div class="skeleton-line"></div>
          </div>
          @for (_ of counter; track _) {
            <div class="skeleton-table-row">
              <div class="skeleton-line"></div>
            </div>
          }
        </div>
      }
    </div>
    `,
  styles: [
    `
      .skeleton-wrapper {
        width: 100%;
      }

      @keyframes shimmer {
        0% {
          background-position: -468px 0;
        }
        100% {
          background-position: 468px 0;
        }
      }

      .skeleton-card {
        border-radius: 12px;
        overflow: hidden;
        background: var(--surface-raised);
        box-shadow: var(--elevation-2);
      }

      .skeleton-image {
        width: 100%;
        height: 200px;
        background: var(--surface-elevated); /* Reemplazado gradiente con color sólido */
        background-size: 468px;
        animation: shimmer 1.2s ease-in-out infinite;
      }
      .skeleton-content {
        padding: 16px;
      }

      .skeleton-line {
        height: 12px;
        margin-bottom: 8px;
        border-radius: 4px;
        background: var(--surface-elevated); /* Reemplazado gradiente con color sólido */
        background-size: 468px;
        animation: shimmer 1.2s ease-in-out infinite;
      }
      .skeleton-title {
        height: 16px;
        width: 60%;
        margin-bottom: 12px;
      }

      .skeleton-text {
        width: 100%;
      }

      .skeleton-text.short {
        width: 80%;
      }

      .skeleton-circle {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--surface-elevated); /* Reemplazado gradiente con color sólido */
        background-size: 468px;
        animation: shimmer 1.2s ease-in-out infinite;
      }
      .skeleton-rect {
        border-radius: 8px;
        background: var(--surface-elevated); /* Reemplazado gradiente con color sólido */
        background-size: 468px;
        animation: shimmer 1.2s ease-in-out infinite;
      }
      .skeleton-text-wrapper {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .skeleton-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .skeleton-list-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        background: var(--surface-raised);
        border: 1px solid var(--border-muted);
      }

      .skeleton-list-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .skeleton-circle.small {
        width: 40px;
        height: 40px;
      }

      .skeleton-conversation {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .skeleton-conversation-item {
        display: flex;
        gap: 16px;
        padding: 16px;
        border-radius: 12px;
        background: var(--surface-raised);
        border: 1px solid var(--border-muted);
      }

      .skeleton-conversation-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .skeleton-table {
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid var(--border-muted);
      }

      .skeleton-table-header {
        padding: 12px 16px;
        background: var(--surface-elevated);
        border-bottom: 1px solid var(--border-muted);
      }

      .skeleton-table-row {
        padding: 12px 16px;
        background: var(--surface-raised);
        border-bottom: 1px solid var(--border-muted);
      }

      .skeleton-table-row:last-child {
        border-bottom: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonLoaderComponent {
  @Input() type: SkeletonType = 'text';
  @Input() count = 1;
  @Input() width = 100;
  @Input() height = 100;

  get counter(): number[] {
    return Array(this.count).fill(0);
  }
}
