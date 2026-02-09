import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Booking Status Badge — Atomic UI component
 *
 * Renders a compact, color-coded badge with icon.
 * Accepts pre-computed display data from BookingUiService.
 */
@Component({
  selector: 'app-booking-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors"
      [class]="badgeClass()"
      [attr.aria-label]="'Estado: ' + label()">
      <span class="text-sm leading-none" aria-hidden="true">{{ icon() }}</span>
      <span>{{ label() }}</span>
    </span>
  `,
})
export class BookingStatusBadgeComponent {
  /** Short label ("Pagar", "En curso") */
  readonly label = input.required<string>();
  /** Emoji icon */
  readonly icon = input<string>('');
  /** Tailwind badge classes */
  readonly badgeClass = input<string>('bg-slate-50 text-slate-600 border-slate-200');
  /** Size variant */
  readonly size = input<'sm' | 'md'>('sm');

  protected readonly sizeClasses = computed(() =>
    this.size() === 'md' ? 'text-sm px-3 py-1' : '',
  );
}
