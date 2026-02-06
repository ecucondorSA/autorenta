import { Pipe, PipeTransform } from '@angular/core';
import { NotificationItem } from '@core/services/infrastructure/user-notifications.service';

@Pipe({
    name: 'notificationIcon',
    standalone: true,
    pure: true,
})
export class NotificationIconPipe implements PipeTransform {
    transform(type: NotificationItem['type'] | undefined): string {
        switch (type) {
            case 'success':
                return '✅';
            case 'warning':
                return '⚠️';
            case 'error':
                return '❌';
            case 'info':
            default:
                return 'ℹ️';
        }
    }
}
