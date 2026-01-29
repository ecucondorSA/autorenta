import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div [class]="cardClasses()">
      @if (hasHeader()) {
        <div class="card-header border-b border-border-default pb-4 mb-4">
          <ng-content select="[header]"></ng-content>
        </div>
      }
      <div class="card-body">
        <ng-content></ng-content>
      </div>
      @if (hasFooter()) {
        <div class="card-footer border-t border-border-default pt-4 mt-4">
          <ng-content select="[footer]"></ng-content>
        </div>
      }
    </div>
  `,
})
export class CardComponent {
  variant = input<'flat' | 'elevated' | 'outlined'>('elevated');
  padding = input<'none' | 'sm' | 'md' | 'lg'>('md');
  hoverable = input(false);
  hasHeader = input(false);
  hasFooter = input(false);
  cardClasses = computed(() => {
    const base = 'bg-surface-raised rounded-lg transition-shadow';
    const v = this.variant();
    const vClass =
      v === 'flat' ? '' : v === 'elevated' ? 'shadow-elevation-2' : 'border border-border-default';
    const p = this.padding();
    const pClass = p === 'none' ? '' : p === 'sm' ? 'p-4' : p === 'md' ? 'p-6' : 'p-8';
    const hClass = this.hoverable() ? 'hover:shadow-elevation-3 cursor-pointer' : '';
    return base + ' ' + vClass + ' ' + pClass + ' ' + hClass;
  });
}
