import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef, signal, Pipe, PipeTransform, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'safeHtml',
  standalone: true
})
export class SafeHtmlPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);
  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }
}

export interface VisualOption<T = unknown> {
  value: T;
  label: string;
  subLabel?: string;
  icon: string; // key for the internal icon map
}

@Component({
  selector: 'app-visual-selector',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => VisualSelectorComponent),
      multi: true,
    },
  ],
  template: `
    <div class="visual-selector-container">
      @if (label) {
        <label class="block text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">
          {{ label }}
        </label>
      }

      <div 
        class="grid gap-3" 
        [ngClass]="{
          'grid-cols-1': cols === 1,
          'grid-cols-2': cols === 2,
          'grid-cols-3': cols === 3,
          'sm:grid-cols-2': cols === 1 && responsive,
          'sm:grid-cols-4': cols === 2 && responsive
        }"
      >
        @for (option of options; track option.value) {
          <button
            type="button"
            (click)="select(option.value)"
            class="group relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 outline-none focus:ring-4 focus:ring-cta-default/20"
            [ngClass]="{
              'bg-cta-default/5 border-cta-default shadow-sm': value() === option.value,
              'bg-surface-base border-border-default hover:border-cta-default/50 hover:bg-surface-secondary': value() !== option.value,
              'h-32': size === 'lg',
              'h-24': size === 'md',
              'h-16': size === 'sm',
              'opacity-50 cursor-not-allowed': disabled()
            }"
            [disabled]="disabled()"
          >
            <!-- Checkmark badge for selected state -->
            @if (value() === option.value) {
              <div class="absolute top-2 right-2 text-cta-default">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
            }

            <!-- Icon -->
            <div 
              class="mb-3 transition-transform duration-200 group-hover:scale-110"
              [ngClass]="{
                'text-cta-default': value() === option.value,
                'text-text-muted group-hover:text-text-primary': value() !== option.value
              }"
              [innerHTML]="getIcon(option.icon) | safeHtml"
            ></div>

            <!-- Label -->
            <span 
              class="text-sm font-bold text-center leading-tight"
              [ngClass]="{
                'text-cta-default': value() === option.value,
                'text-text-secondary group-hover:text-text-primary': value() !== option.value
              }"
            >
              {{ option.label }}
            </span>

            <!-- SubLabel -->
            @if (option.subLabel) {
              <span class="text-xs text-text-muted mt-1 text-center font-medium">
                {{ option.subLabel }}
              </span>
            }
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class VisualSelectorComponent<T = unknown> implements ControlValueAccessor {
  @Input() options: VisualOption<T>[] = [];
  @Input() label = '';
  @Input() cols = 2;
  @Input() responsive = true;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  value = signal<T | null>(null);
  disabled = signal(false);

  private onChange: (value: T | null) => void = () => {};
  private onTouched: () => void = () => {};

  select(val: T) {
    if (this.disabled()) return;
    this.value.set(val);
    this.onChange(val);
    this.onTouched();
  }

  writeValue(val: T | null): void {
    this.value.set(val);
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  getIcon(name: string): string {
    const icons: Record<string, string> = {
      // Transmission
      manual: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 3v16h-4V3h4z"/><path d="M5 3v16h4V3H5z"/><path d="M12 3v18"/></svg>`, 
      automatic: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`,
      
      // Fuel
      nafta: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22v-8a2 2 0 0 1 2-2h2.5a2 2 0 0 1 2 2v8"/><path d="M11.5 14a2.5 2.5 0 0 0-2.5-2.5H4.5"/><path d="M14 7h7v13h-7z"/><path d="M15 11h2"/><path d="M15 15h2"/></svg>`,
      gasoil: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22v-8a2 2 0 0 1 2-2h2.5a2 2 0 0 1 2 2v8"/><path d="M11.5 14a2.5 2.5 0 0 0-2.5-2.5H4.5"/><path d="M14 7h7v13h-7z"/><path d="M15 11h2"/><path d="M15 15h2"/><text x="18" y="5" font-size="6" text-anchor="middle" fill="currentColor">D</text></svg>`,
      electric: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
      hybrid: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
      
      // Mileage
      low: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l-4 2"/></svg>`,
      mid: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
      unlimited: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-1.26-8.178-2.894L8 11.106C6.955 9.74 4.917 8 0.822 8 0 8 0 16 0 16h1.644"/></svg>`, // Infinity approx
      
      // Default
      default: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`
    };
    return icons[name] || icons['default'];
  }
}