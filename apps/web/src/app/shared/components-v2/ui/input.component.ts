import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Input Component V2
 * Mobile-optimized form input with validation states
 * 
 * Types:
 * - text, email, password, tel, url, number, search
 * - textarea for multi-line
 * 
 * Features:
 * - Label with optional indicator
 * - Helper text
 * - Error state with message
 * - Success state
 * - Leading/trailing icons
 * - Clear button
 * - Character counter
 * - Auto-resize textarea
 */
@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div [class]="wrapperClasses()">
      <!-- Label -->
      @if (label()) {
        <label [for]="inputId()" class="label">
          {{ label() }}
          @if (required()) {
            <span class="required">*</span>
          }
        </label>
      }

      <!-- Input Container -->
      <div class="input-container">
        <!-- Leading Icon -->
        @if (iconLeading()) {
          <span class="icon icon-leading">
            <ng-content select="[iconLeading]" />
          </span>
        }

        <!-- Input or Textarea -->
        @if (type() === 'textarea') {
          <textarea
            [id]="inputId()"
            [placeholder]="placeholder()"
            [disabled]="disabled()"
            [required]="required()"
            [rows]="rows()"
            [maxlength]="maxLength() || null"
            [(ngModel)]="internalValue"
            (blur)="onBlur()"
            (focus)="onFocus()"
            class="input-field textarea-field"
          ></textarea>
        } @else {
          <input
            [id]="inputId()"
            [type]="type()"
            [placeholder]="placeholder()"
            [disabled]="disabled()"
            [required]="required()"
            [maxlength]="maxLength() || null"
            [(ngModel)]="internalValue"
            (blur)="onBlur()"
            (focus)="onFocus()"
            class="input-field"
          />
        }

        <!-- Trailing Icon / Clear Button -->
        @if (showClear()) {
          <button
            type="button"
            class="icon icon-trailing clear-btn"
            (click)="clearInput()"
            aria-label="Limpiar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        } @else if (iconTrailing()) {
          <span class="icon icon-trailing">
            <ng-content select="[iconTrailing]" />
          </span>
        }
      </div>

      <!-- Helper Text / Error / Character Counter -->
      <div class="footer">
        @if (error()) {
          <span class="error-text">{{ error() }}</span>
        } @else if (helperText()) {
          <span class="helper-text">{{ helperText() }}</span>
        }

        @if (maxLength() && showCounter()) {
          <span class="char-counter">
            {{ internalValue().length }} / {{ maxLength() }}
          </span>
        }
      </div>
    </div>
  `,
  styles: [`
    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .required {
      color: #EF4444;
    }

    .input-container {
      position: relative;
      display: flex;
      align-items: center;
      background: white;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      transition: all 0.2s ease;
    }

    .input-container:focus-within {
      border-color: #4F46E5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }

    .input-wrapper.has-error .input-container {
      border-color: #EF4444;
    }

    .input-wrapper.has-error .input-container:focus-within {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    .input-wrapper.is-success .input-container {
      border-color: #10B981;
    }

    .input-wrapper.is-disabled .input-container {
      background: #F9FAFB;
      opacity: 0.6;
    }

    .input-field {
      flex: 1;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      font-family: inherit;
      color: #1F2937;
      background: transparent;
      border: none;
      outline: none;
      min-height: 44px;
    }

    .input-field::placeholder {
      color: #9CA3AF;
    }

    .textarea-field {
      resize: vertical;
      min-height: 88px;
      line-height: 1.5;
    }

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      color: #6B7280;
    }

    .icon-leading {
      margin-left: 1rem;
    }

    .icon-trailing {
      margin-right: 1rem;
    }

    .clear-btn {
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      transition: color 0.2s ease;
    }

    .clear-btn:hover {
      color: #EF4444;
    }

    .icon :global(svg) {
      width: 100%;
      height: 100%;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 1.25rem;
      font-size: 0.875rem;
    }

    .helper-text {
      color: #6B7280;
    }

    .error-text {
      color: #EF4444;
      font-weight: 500;
    }

    .char-counter {
      color: #9CA3AF;
      margin-left: auto;
    }

    /* Size variants */
    .input-sm .input-field {
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      min-height: 36px;
    }

    .input-lg .input-field {
      padding: 1rem 1.25rem;
      font-size: 1.125rem;
      min-height: 52px;
    }
  `]
})
export class InputComponent {
  // Props
  inputId = input<string>(`input-${Math.random().toString(36).substr(2, 9)}`);
  type = input<'text' | 'email' | 'password' | 'tel' | 'url' | 'number' | 'search' | 'textarea'>('text');
  label = input<string | null>(null);
  placeholder = input<string>('');
  helperText = input<string | null>(null);
  error = input<string | null>(null);
  value = input<string>('');
  disabled = input<boolean>(false);
  required = input<boolean>(false);
  maxLength = input<number | null>(null);
  showCounter = input<boolean>(false);
  clearable = input<boolean>(false);
  rows = input<number>(3);
  size = input<'sm' | 'md' | 'lg'>('md');
  iconLeading = input<boolean>(false);
  iconTrailing = input<boolean>(false);
  success = input<boolean>(false);

  // Events
  valueChange = output<string>();
  blurred = output<void>();
  focused = output<void>();

  // State
  internalValue = signal('');
  isFocused = signal(false);

  constructor() {
    // Sync internal value with input
    effect(() => {
      this.internalValue.set(this.value());
    });

    // Emit value changes
    effect(() => {
      const val = this.internalValue();
      this.valueChange.emit(val);
    });
  }

  wrapperClasses(): string {
    const classes = [
      'input-wrapper',
      `input-${this.size()}`,
    ];

    if (this.error()) classes.push('has-error');
    if (this.success()) classes.push('is-success');
    if (this.disabled()) classes.push('is-disabled');
    if (this.isFocused()) classes.push('is-focused');

    return classes.join(' ');
  }

  showClear(): boolean {
    return this.clearable() && this.internalValue().length > 0 && !this.disabled();
  }

  clearInput(): void {
    this.internalValue.set('');
    this.valueChange.emit('');
  }

  onFocus(): void {
    this.isFocused.set(true);
    this.focused.emit();
  }

  onBlur(): void {
    this.isFocused.set(false);
    this.blurred.emit();
  }
}
