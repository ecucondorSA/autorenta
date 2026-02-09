import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  EventEmitter,
  input,
  model,
  Output,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * OTP Input Component
 *
 * A 6-digit OTP input with:
 * - Auto-focus to next input on digit entry
 * - Backspace navigates to previous input
 * - Paste support for full 6-digit codes
 * - Error state with shake animation
 * - Accessible with proper ARIA labels
 *
 * @example
 * <app-otp-input
 *   [(value)]="otpCode"
 *   [disabled]="loading()"
 *   [hasError]="!!error()"
 *   (complete)="onOtpComplete($event)"
 * />
 */
@Component({
  selector: 'app-otp-input',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex gap-2 sm:gap-3 justify-center"
      role="group"
      aria-label="Código de verificación"
    >
      @for (i of indices; track i) {
        <input
          #inputs
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          maxlength="1"
          autocomplete="one-time-code"
          [value]="digits()[i] || ''"
          (input)="onInput($event, i)"
          (keydown)="onKeydown($event, i)"
          (focus)="onFocus(i)"
          (paste)="onPaste($event)"
          [disabled]="disabled()"
          class="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-mono
                 rounded-xl border-2 bg-surface-base
                 focus:border-cta-default focus:ring-2 focus:ring-cta-default/20
                 focus:outline-none
                 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-all duration-200"
          [class.border-border-default]="!hasError()"
          [class.border-error-border]="hasError()"
          [class.animate-shake]="hasError()"
          [attr.aria-label]="'Dígito ' + (i + 1) + ' de 6'"
          [attr.aria-invalid]="hasError()"
        />
      }
    </div>
  `,
  styles: [
    `
      @keyframes shake {
        0%,
        100% {
          transform: translateX(0);
        }
        10%,
        30%,
        50%,
        70%,
        90% {
          transform: translateX(-4px);
        }
        20%,
        40%,
        60%,
        80% {
          transform: translateX(4px);
        }
      }

      .animate-shake {
        animation: shake 0.5s ease-in-out;
      }
    `,
  ],
})
export class OtpInputComponent {
  /** Two-way binding for the OTP value */
  readonly value = model<string>('');

  /** Disables all inputs */
  readonly disabled = input(false);

  /** Shows error state with red border and shake animation */
  readonly hasError = input(false);

  /** Emits when all 6 digits are entered */
  @Output() complete = new EventEmitter<string>();

  /** Reference to all input elements for focus management */
  @ViewChildren('inputs') inputRefs!: QueryList<ElementRef<HTMLInputElement>>;

  /** Indices for the 6 input boxes */
  readonly indices = [0, 1, 2, 3, 4, 5];

  /** Computed array of individual digits from the value */
  readonly digits = computed(() => this.value().split(''));

  /** Computed flag indicating if OTP is complete (6 digits) */
  readonly isComplete = computed(() => this.value().length === 6);

  /**
   * Handle input event - update value and move to next input
   */
  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const char = input.value;

    // Only accept digits
    if (!/^\d*$/.test(char)) {
      input.value = '';
      return;
    }

    // Update the value at this position
    const currentValue = this.value();
    const chars = currentValue.split('');

    // Pad array to ensure we can set the value at index
    while (chars.length < index) {
      chars.push('');
    }

    chars[index] = char.slice(-1); // Take last character if multiple
    const newValue = chars.join('').slice(0, 6);
    this.value.set(newValue);

    // Move to next input if we have a digit
    if (char && index < 5) {
      this.focusInput(index + 1);
    }

    // Emit complete event when all 6 digits are entered
    if (newValue.length === 6) {
      this.complete.emit(newValue);
    }
  }

  /**
   * Handle keydown - support backspace navigation
   */
  onKeydown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      if (!input.value && index > 0) {
        // Move to previous input and clear it
        event.preventDefault();
        const currentValue = this.value();
        const chars = currentValue.split('');
        chars[index - 1] = '';
        this.value.set(chars.join(''));
        this.focusInput(index - 1);
      } else if (input.value) {
        // Clear current input
        const currentValue = this.value();
        const chars = currentValue.split('');
        chars[index] = '';
        this.value.set(chars.join(''));
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusInput(index - 1);
    } else if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      this.focusInput(index + 1);
    }
  }

  /**
   * Handle focus - select content for easy replacement
   */
  onFocus(index: number): void {
    const inputs = this.inputRefs?.toArray();
    if (inputs?.[index]) {
      inputs[index].nativeElement.select();
    }
  }

  /**
   * Handle paste - distribute digits across all inputs
   */
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';

    // Extract only digits
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);

    if (digits) {
      this.value.set(digits);

      // Focus the next empty input or the last one
      const nextIndex = Math.min(digits.length, 5);
      this.focusInput(nextIndex);

      // Emit complete if we got 6 digits
      if (digits.length === 6) {
        this.complete.emit(digits);
      }
    }
  }

  /**
   * Focus a specific input by index
   */
  private focusInput(index: number): void {
    setTimeout(() => {
      const inputs = this.inputRefs?.toArray();
      if (inputs?.[index]) {
        inputs[index].nativeElement.focus();
      }
    }, 0);
  }

  /**
   * Public method to focus the first input
   */
  focusFirst(): void {
    this.focusInput(0);
  }

  /**
   * Public method to clear all inputs and focus first
   */
  clear(): void {
    this.value.set('');
    this.focusFirst();
  }
}
