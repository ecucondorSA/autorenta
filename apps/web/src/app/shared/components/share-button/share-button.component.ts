import { Component, Input, signal, inject, ChangeDetectionStrategy } from '@angular/core';

import { ShareService } from '@core/services/ui/share.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { HeaderIconComponent } from '../header-icon/header-icon.component';

export type ShareType = 'car' | 'booking' | 'app' | 'custom';

@Component({
  selector: 'app-share-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeaderIconComponent],
  template: `
    <button
      type="button"
      (click)="handleShare()"
      [disabled]="sharing()"
      [class]="buttonClass"
      [attr.aria-label]="ariaLabel"
    >
      @if (sharing()) {
        <svg
          class="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span>Compartiendo...</span>
      } @else {
        <app-header-icon name="share" [size]="20" />
        <span>{{ label }}</span>
      }
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
      button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
})
export class ShareButtonComponent {
  @Input() type: ShareType = 'custom';
  @Input() carId?: string;
  @Input() carTitle?: string;
  @Input() carPrice?: number;
  @Input() bookingId?: string;
  @Input() bookingDetails?: string;
  @Input() customTitle?: string;
  @Input() customText?: string;
  @Input() customUrl?: string;
  @Input() label = 'Compartir';
  @Input() buttonClass =
    'inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cta-default text-cta-text hover:bg-cta-default transition-colors';
  @Input() ariaLabel = 'Compartir';

  private readonly shareService = inject(ShareService);
  private readonly toastService = inject(NotificationManagerService);

  readonly sharing = signal(false);

  async handleShare(): Promise<void> {
    this.sharing.set(true);

    try {
      let success = false;

      switch (this.type) {
        case 'car':
          if (this.carId && this.carTitle && this.carPrice !== undefined) {
            success = await this.shareService.shareCar(this.carId, this.carTitle, this.carPrice);
          }
          break;

        case 'booking':
          if (this.bookingId && this.bookingDetails) {
            success = await this.shareService.shareBooking(this.bookingId, this.bookingDetails);
          }
          break;

        case 'app':
          success = await this.shareService.shareApp();
          break;

        case 'custom':
        default:
          if (this.customTitle || this.customText || this.customUrl) {
            success = await this.shareService.share({
              title: this.customTitle,
              text: this.customText,
              url: this.customUrl,
            });
          }
          break;
      }

      if (success) {
        this.toastService.success('Éxito', '¡Compartido exitosamente!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      this.toastService.error('Error', 'No se pudo compartir. Intenta nuevamente.');
    } finally {
      this.sharing.set(false);
    }
  }
}
