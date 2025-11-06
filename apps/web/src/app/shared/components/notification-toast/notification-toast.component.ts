import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService, type Notification } from '../../../core/services/notification.service';

@Component({
  standalone: true,
  selector: 'app-notification-toast',
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      <div
        *ngFor="let notification of notifications()"
        class="pointer-events-auto max-w-sm w-full bg-white shadow-lg rounded-lg overflow-hidden transform transition-all duration-300 ease-in-out animate-slide-in"
        [class]="getNotificationClass(notification.type)"
      >
        <div class="p-4">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                [class]="getIconClass(notification.type)"
              >
                {{ notification.icon }}
              </div>
            </div>
            <div class="ml-3 w-0 flex-1 pt-0.5">
              <p class="text-sm font-medium text-gray-900">
                {{ notification.title }}
              </p>
              <p class="mt-1 text-sm text-gray-500">
                {{ notification.message }}
              </p>
            </div>
            <div class="ml-4 flex-shrink-0 flex">
              <button
                type="button"
                (click)="close(notification.id)"
                class="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md"
              >
                <span class="sr-only">Cerrar</span>
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Progress bar -->
        <div *ngIf="notification.duration && notification.duration > 0" class="h-1 bg-gray-200">
          <div
            class="h-full transition-all ease-linear"
            [class]="getProgressBarClass(notification.type)"
            [style.animation]="'progress ' + notification.duration + 'ms linear'"
          ></div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes slide-in {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes progress {
        from {
          width: 100%;
        }
        to {
          width: 0%;
        }
      }

      .animate-slide-in {
        animation: slide-in 0.3s ease-out;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationToastComponent {
  private readonly notificationService = inject(NotificationService);

  readonly notifications = this.notificationService.notifications;

  close(id: string): void {
    this.notificationService.remove(id);
  }

  getNotificationClass(type: Notification['type']): string {
    const baseClass = 'border-l-4';
    switch (type) {
      case 'success':
        return `${baseClass} border-green-500`;
      case 'error':
        return `${baseClass} border-red-500`;
      case 'warning':
        return `${baseClass} border-yellow-500`;
      case 'info':
        return `${baseClass} border-blue-500`;
    }
  }

  getIconClass(type: Notification['type']): string {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-600';
      case 'error':
        return 'bg-red-100 text-red-600';
      case 'warning':
        return 'bg-yellow-100 text-yellow-600';
      case 'info':
        return 'bg-blue-100 text-blue-600';
    }
  }

  getProgressBarClass(type: Notification['type']): string {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
        return 'bg-blue-500';
    }
  }
}
