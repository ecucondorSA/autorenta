import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

type SkeletonType = 'text' | 'circle' | 'rect' | 'card' | 'avatar' | 'list-item' | 'table-row';
type SkeletonSize = 'sm' | 'md' | 'lg';

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
  imports: [CommonModule],
  template: `
    <div class="skeleton-wrapper">
      <!-- Card Skeleton -->
      <div *ngIf="type === 'card'" class="skeleton-card" [class.skeleton-card-sm]="size === 'sm'" [class.skeleton-card-lg]="size === 'lg'">
        <div class="skeleton-image"></div>
        <div class="skeleton-content">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-text"></div>
          <div class="skeleton-line skeleton-text short"></div>
        </div>
      </div>

      <!-- Text Skeleton -->
      <div *ngIf="type === 'text'" class="skeleton-text-wrapper">
        <div *ngFor="let _ of counter" class="skeleton-line" [class.skeleton-line-sm]="size === 'sm'" [class.skeleton-line-lg]="size === 'lg'"></div>
      </div>

      <!-- Circle Skeleton (para avatares) -->
      <div *ngIf="type === 'circle' || type === 'avatar'" class="skeleton-circle" [class.skeleton-circle-sm]="size === 'sm'" [class.skeleton-circle-lg]="size === 'lg'"></div>

      <!-- Rectangle Skeleton -->
      <div
        *ngIf="type === 'rect'"
        class="skeleton-rect"
        [style.width.px]="width"
        [style.height.px]="height"
      ></div>

      <!-- List Item Skeleton -->
      <div *ngIf="type === 'list-item'" class="skeleton-list-item">
        <div class="skeleton-circle skeleton-circle-sm"></div>
        <div class="flex-1">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-text short"></div>
        </div>
      </div>

      <!-- Table Row Skeleton -->
      <div *ngIf="type === 'table-row'" class="skeleton-table-row">
        <div class="skeleton-line" style="width: 20%;"></div>
        <div class="skeleton-line" style="width: 30%;"></div>
        <div class="skeleton-line" style="width: 25%;"></div>
        <div class="skeleton-line" style="width: 15%;"></div>
      </div>
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
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      :host-context(.dark) .skeleton-card {
        background: #1a1a1a;
      }

      .skeleton-image {
        width: 100%;
        height: 200px;
        background: linear-gradient(90deg, #e0e0e0 0px, #ececec 40px, #e0e0e0 80px);
        background-size: 468px;
        animation: shimmer 1.2s ease-in-out infinite;
      }

      :host-context(.dark) .skeleton-image {
        background: linear-gradient(90deg, #2a2a2a 0px, #333333 40px, #2a2a2a 80px);
      }

      .skeleton-content {
        padding: 16px;
      }

      .skeleton-line {
        height: 12px;
        margin-bottom: 8px;
        border-radius: 4px;
        background: linear-gradient(90deg, #f0f0f0 0px, #f8f8f8 40px, #f0f0f0 80px);
        background-size: 468px;
        animation: shimmer 1.2s ease-in-out infinite;
      }

      :host-context(.dark) .skeleton-line {
        background: linear-gradient(90deg, #2a2a2a 0px, #333333 40px, #2a2a2a 80px);
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
        background: linear-gradient(90deg, #f0f0f0 0px, #f8f8f8 40px, #f0f0f0 80px);
        background-size: 468px;
        animation: shimmer 1.2s ease-in-out infinite;
      }

      :host-context(.dark) .skeleton-circle {
        background: linear-gradient(90deg, #2a2a2a 0px, #333333 40px, #2a2a2a 80px);
      }

      .skeleton-rect {
        border-radius: 8px;
        background: linear-gradient(90deg, #f0f0f0 0px, #f8f8f8 40px, #f0f0f0 80px);
        background-size: 468px;
        animation: shimmer 1.2s ease-in-out infinite;
      }

      :host-context(.dark) .skeleton-rect {
        background: linear-gradient(90deg, #2a2a2a 0px, #333333 40px, #2a2a2a 80px);
      }

      .skeleton-text-wrapper {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      /* Size variants for cards */
      .skeleton-card-sm .skeleton-image {
        height: 120px;
      }

      .skeleton-card-lg .skeleton-image {
        height: 300px;
      }

      /* Size variants for text */
      .skeleton-line-sm {
        height: 8px;
      }

      .skeleton-line-lg {
        height: 16px;
      }

      /* Size variants for circles */
      .skeleton-circle-sm {
        width: 32px;
        height: 32px;
      }

      .skeleton-circle-lg {
        width: 64px;
        height: 64px;
      }

      /* List item variant */
      .skeleton-list-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: white;
        border-radius: 8px;
      }

      :host-context(.dark) .skeleton-list-item {
        background: #1a1a1a;
      }

      /* Table row variant */
      .skeleton-table-row {
        display: flex;
        gap: 16px;
        padding: 12px;
        align-items: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonLoaderComponent {
  @Input() type: SkeletonType = 'text';
  @Input() size: SkeletonSize = 'md';
  @Input() count = 1;
  @Input() width = 100;
  @Input() height = 100;
  @Input() animated = true;

  get counter(): number[] {
    return Array(this.count).fill(0);
  }
}
