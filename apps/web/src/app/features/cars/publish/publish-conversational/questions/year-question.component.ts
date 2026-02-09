import { Component, input, output, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { getYearOptions } from '../questions.config';

/**
 * Year selection question
 * Features a scrollable year grid with current year highlighted
 */
@Component({
  selector: 'app-year-question',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Brand reminder -->
      @if (brandName()) {
        <div class="text-center">
          <span
            class="inline-flex items-center gap-2 px-4 py-2 bg-surface-secondary rounded-full text-sm"
          >
            <span class="text-text-muted">Para tu</span>
            <span class="font-semibold text-text-primary">{{ brandName() }}</span>
          </span>
        </div>
      }

      <!-- Year grid -->
      <div class="year-grid grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-80 overflow-y-auto p-1">
        @for (year of years; track year) {
          <button
            type="button"
            (click)="selectYear(year)"
            class="py-3 px-2 rounded-xl font-medium text-center transition-all"
            [class.bg-cta-default]="selectedYear() === year"
            [class.text-white]="selectedYear() === year"
            [class.shadow-lg]="selectedYear() === year"
            [class.shadow-cta-default/30]="selectedYear() === year"
            [class.scale-105]="selectedYear() === year"
            [class.bg-surface-raised]="selectedYear() !== year"
            [class.text-text-primary]="selectedYear() !== year"
            [class.hover:bg-surface-hover]="selectedYear() !== year"
            [class.border]="selectedYear() !== year"
            [class.border-border-default]="selectedYear() !== year"
          >
            {{ year }}
          </button>
        }
      </div>

      <!-- Quick select for common years -->
      <div class="flex flex-wrap justify-center gap-2">
        <span class="text-xs text-text-muted">Selección rápida:</span>
        @for (year of recentYears; track year) {
          <button
            type="button"
            (click)="selectYear(year)"
            class="px-3 py-1 text-sm rounded-full transition-all"
            [class.bg-cta-default/10]="selectedYear() === year"
            [class.text-cta-default]="selectedYear() === year"
            [class.font-semibold]="selectedYear() === year"
            [class.bg-surface-secondary]="selectedYear() !== year"
            [class.text-text-secondary]="selectedYear() !== year"
            [class.hover:bg-surface-hover]="selectedYear() !== year"
          >
            {{ year }}
          </button>
        }
      </div>

      <!-- Selected year indicator -->
      @if (selectedYear()) {
        <div class="text-center">
          <p class="text-2xl font-bold text-cta-default">{{ selectedYear() }}</p>
          <p class="text-sm text-text-muted">Año seleccionado</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .year-grid {
        scrollbar-width: thin;
        scrollbar-color: var(--color-border-default) transparent;
      }

      .year-grid::-webkit-scrollbar {
        width: 6px;
      }

      .year-grid::-webkit-scrollbar-track {
        background: transparent;
      }

      .year-grid::-webkit-scrollbar-thumb {
        background-color: var(--color-border-default);
        border-radius: 3px;
      }
    `,
  ],
})
export class YearQuestionComponent implements OnInit {
  readonly brandName = input<string>();
  readonly initialValue = input<number | null>(null);
  readonly yearSelected = output<number>();

  readonly years = getYearOptions();
  readonly currentYear = new Date().getFullYear();
  readonly recentYears = [
    this.currentYear,
    this.currentYear - 1,
    this.currentYear - 2,
    this.currentYear - 3,
  ];

  readonly selectedYear = signal<number | null>(null);

  ngOnInit(): void {
    const initial = this.initialValue();
    if (initial) {
      this.selectedYear.set(initial);
    }
  }

  selectYear(year: number): void {
    this.selectedYear.set(year);
    this.yearSelected.emit(year);
  }
}
