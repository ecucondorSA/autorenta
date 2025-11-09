import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

/**
 * ToastComponent
 *
 * Componente para mostrar notificaciones toast.
 * Se debe agregar una sola vez en el layout principal (app.component.html).
 *
 * Las notificaciones se posicionan en la esquina superior derecha
 * y desaparecen automáticamente después de un tiempo.
 */
@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class ToastComponent {
  private readonly toastService = inject(ToastService);

  readonly toasts = this.toastService.notifications;

  /**
   * Remueve un toast manualmente
   */
  remove(id: string): void {
    this.toastService.remove(id);
  }

  /**
   * Obtiene el ícono SVG según el tipo de toast
   */
  getIcon(type: string): string {
    const icons = {
      success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
      warning:
        'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    };
    return icons[type as keyof typeof icons] || icons.info;
  }

  /**
   * Obtiene las clases CSS según el tipo de toast
   */
  getClasses(type: string): string {
    const classes = {
      success:
        'bg-success-50 border-success-500 text-success-700 dark:bg-success-900/30 dark:border-success-700 dark:text-success-100',
      error:
        'bg-error-50 border-error-500 text-error-700 dark:bg-error-900/30 dark:border-error-700 dark:text-error-100',
      warning:
        'bg-warning-50 border-warning-500 text-warning-700 dark:bg-warning-900/30 dark:border-warning-700 dark:text-warning-100',
      info: 'bg-cta-default/10 border-cta-default text-cta-default dark:bg-cta-default/30 dark:border-cta-default dark:text-cta-default',
    };
    return classes[type as keyof typeof classes] || classes.info;
  }
}
