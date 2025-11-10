import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  ChangeDetectionStrategy,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-toast.component.html',
  styleUrls: ['./notification-toast.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationToastComponent implements OnInit {
  @Input() message = '';
  @Input() type: ToastType = 'info';
  @Input() duration = 3000;
  @Input() isVisible = signal(false);

  @Output() dismiss = new EventEmitter<void>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  ngOnInit(): void {
    if (this.isBrowser && this.isVisible() && this.duration > 0) {
      setTimeout(() => {
        this.onDismiss();
      }, this.duration);
    }
  }

  onDismiss(): void {
    this.isVisible.set(false);
    this.dismiss.emit();
  }

  getIcon(): string {
    const icons = {
      success: '✓',
      info: 'ℹ️',
      warning: '⚠️',
      error: '✕',
    };
    return icons[this.type];
  }

  getColorClasses(): string {
    const colors = {
      success:
        'bg-success-light/10 border-success-light/40 text-success-light dark:bg-success-light/20 dark:border-success-light dark:text-success-light',
      info: 'bg-cta-default/10 border-cta-default/40 text-cta-default dark:bg-cta-default/20 dark:border-cta-default dark:text-cta-default',
      warning:
        'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
      error:
        'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
    };
    return colors[this.type];
  }
}
