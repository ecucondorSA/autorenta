import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

/**
 * ToastService
 *
 * Servicio para mostrar notificaciones toast en la aplicación.
 * Reemplaza el uso de alert() con notificaciones más amigables.
 *
 * Uso:
 * ```typescript
 * constructor(private toast: ToastService) {}
 *
 * this.toast.success('Operación exitosa');
 * this.toast.error('Error al procesar');
 * this.toast.warning('Advertencia');
 * this.toast.info('Información');
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly toasts = signal<Toast[]>([]);

  /**
   * Obtiene la lista de toasts activos
   */
  getToasts() {
    return this.toasts.asReadonly();
  }

  /**
   * Muestra un toast de éxito
   */
  success(message: string, duration = 3000): void {
    this.show(message, 'success', duration);
  }

  /**
   * Muestra un toast de error
   */
  error(message: string, duration = 5000): void {
    this.show(message, 'error', duration);
  }

  /**
   * Muestra un toast de advertencia
   */
  warning(message: string, duration = 4000): void {
    this.show(message, 'warning', duration);
  }

  /**
   * Muestra un toast de información
   */
  info(message: string, duration = 3000): void {
    this.show(message, 'info', duration);
  }

  /**
   * Muestra un toast genérico
   */
  private show(message: string, type: Toast['type'], duration: number): void {
    const id = this.generateId();
    const toast: Toast = { id, message, type, duration };

    this.toasts.update((toasts) => [...toasts, toast]);

    // Auto-remover después del duration
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  /**
   * Remueve un toast por ID
   */
  remove(id: string): void {
    this.toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  /**
   * Remueve todos los toasts
   */
  clear(): void {
    this.toasts.set([]);
  }

  /**
   * Genera un ID único para el toast
   */
  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
