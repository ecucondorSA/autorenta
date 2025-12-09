import {
  Injectable,
  ApplicationRef,
  createComponent,
  EnvironmentInjector,
  inject,
} from '@angular/core';
import { ConfirmModalComponent, ConfirmModalOptions } from './confirm-modal.component';

/**
 * Service to show branded confirmation modals
 *
 * Reemplaza el uso de `confirm()` nativo con un modal estilizado.
 *
 * @example
 * const confirmService = inject(ConfirmModalService);
 *
 * const confirmed = await confirmService.confirm({
 *   title: 'Cancelar reserva',
 *   message: '¿Seguro querés cancelar? Esta acción no se puede deshacer.',
 *   confirmText: 'Sí, cancelar',
 *   variant: 'danger'
 * });
 *
 * if (confirmed) {
 *   // Proceed with cancellation
 * }
 */
@Injectable({
  providedIn: 'root',
})
export class ConfirmModalService {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  /**
   * Shows a confirmation modal and returns a promise that resolves to true/false
   */
  async confirm(options: ConfirmModalOptions): Promise<boolean> {
    // Create the component dynamically
    const componentRef = createComponent(ConfirmModalComponent, {
      environmentInjector: this.injector,
    });

    // Attach to the DOM
    document.body.appendChild(componentRef.location.nativeElement);

    // Attach to Angular's change detection
    this.appRef.attachView(componentRef.hostView);

    // Open the modal and wait for result
    const result = await componentRef.instance.open(options);

    // Cleanup
    this.appRef.detachView(componentRef.hostView);
    componentRef.destroy();

    return result;
  }

  /**
   * Shortcut for danger confirmation (delete, cancel, etc.)
   */
  async confirmDanger(
    title: string,
    message: string,
    confirmText = 'Eliminar'
  ): Promise<boolean> {
    return this.confirm({
      title,
      message,
      confirmText,
      cancelText: 'Cancelar',
      variant: 'danger',
    });
  }

  /**
   * Shortcut for warning confirmation
   */
  async confirmWarning(
    title: string,
    message: string,
    confirmText = 'Continuar'
  ): Promise<boolean> {
    return this.confirm({
      title,
      message,
      confirmText,
      cancelText: 'Cancelar',
      variant: 'warning',
    });
  }
}
