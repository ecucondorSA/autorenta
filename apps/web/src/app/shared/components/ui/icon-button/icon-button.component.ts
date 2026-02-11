import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { scaleUpOnHoverAnimation } from '../../../../../styles/design-system/tokens/animations';

@Component({
  selector: 'app-icon-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      [class]="buttonClasses"
      [disabled]="disabled"
      [attr.aria-label]="ariaLabel"
      (click)="onClickHandler($event)"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="isHovered = false"
      [@scaleOnHover]="isHovered ? 'hover' : 'normal'"
    >
      <ng-content></ng-content>
    </button>
  `,
  styles: [
    `
      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 0.5rem;
        cursor: pointer;
        transition: all 200ms ease-out;
        font-weight: 500;
      }
      button:focus-visible {
        outline: 2px solid #3ba870;
        outline-offset: 2px;
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .size-sm {
        min-width: 40px;
        min-height: 40px;
        padding: 0.5rem;
        font-size: 0.875rem;
      }
      .size-md {
        min-width: 44px;
        min-height: 44px;
        padding: 0.625rem;
        font-size: 1rem;
      }
      .size-lg {
        min-width: 52px;
        min-height: 52px;
        padding: 0.75rem;
        font-size: 1.125rem;
      }
      .variant-primary {
        background-color: #3ba870;
        color: white;
      }
      .variant-primary:hover:not(:disabled) {
        background-color: #2d8859;
      }
      .variant-secondary {
        background-color: #e5e5e5;
        color: #404040;
      }
      .variant-secondary:hover:not(:disabled) {
        background-color: #d4d4d4;
      }
      .variant-ghost {
        background-color: transparent;
        color: #404040;
      }
      .variant-ghost:hover:not(:disabled) {
        background-color: #f5f5f5;
      }
      .variant-danger {
        background-color: #ef4444;
        color: white;
      }
      .variant-danger:hover:not(:disabled) {
        background-color: #dc2626;
      }
    `,
  ],
  animations: [scaleUpOnHoverAnimation],
})
export class IconButtonComponent {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'ghost';
  @Input() disabled = false;
  @Input() ariaLabel = '';
  @Output() clicked = new EventEmitter<void>();

  isHovered = false;

  get buttonClasses(): string {
    return `size-${this.size} variant-${this.variant}`;
  }

  onMouseEnter(): void {
    if (!this.disabled) {
      this.isHovered = true;
    }
  }

  onClickHandler(_event: MouseEvent): void {
    if (!this.disabled) {
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      this.clicked.emit();
    }
  }
}
