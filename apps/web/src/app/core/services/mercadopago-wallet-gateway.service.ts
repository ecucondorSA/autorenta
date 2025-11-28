import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  WalletPaymentGateway,
  WalletDepositResponse,
  PaymentProvider,
} from '../interfaces/payment-gateway.interface';
import { SupabaseClientService } from './supabase-client.service';

/**
 * MercadoPago Wallet Gateway Service
 *
 * Maneja depósitos al wallet usando MercadoPago como proveedor de pago.
 * Integra con la Edge Function mercadopago-create-deposit-order.
 *
 * Flujo de depósito:
 * 1. Usuario solicita depósito en USD
 * 2. Se convierte a ARS usando tasa de cambio actual
 * 3. Se crea una orden de MercadoPago (mercadopago-create-deposit-order)
 * 4. Usuario es redirigido a MercadoPago para aprobar
 * 5. MercadoPago envía webhook después de pago completado
 * 6. Webhook actualiza wallet balance automáticamente
 *
 * Diferencias vs PayPal:
 * - MercadoPago opera en ARS (PayPal en USD)
 * - Requiere conversión de moneda USD -> ARS
 * - Procesamiento típicamente 1-3 segundos
 * - Soporta transferencias bancarias y tarjetas
 */
@Injectable({
  providedIn: 'root',
})
export class MercadoPagoWalletGatewayService implements WalletPaymentGateway {
  readonly provider: PaymentProvider = 'mercadopago';
  private readonly supabaseService = inject(SupabaseClientService);

  /**
   * Crea una orden de MercadoPago para depósito al wallet
   *
   * @param amountUSD - Monto a depositar en USD
   * @param transactionId - ID de la transacción de wallet
   * @returns Observable con la respuesta de MercadoPago
   */
  createDepositOrder(amountUSD: number, transactionId: string): Observable<WalletDepositResponse> {
    return from(this._createDepositOrder(amountUSD, transactionId)).pipe(
      catchError((err) => {
        return throwError(() => new Error(this.formatError(err)));
      }),
    );
  }

  /**
   * Implementación interna usando async/await
   */
  private async _createDepositOrder(
    amountUSD: number,
    transactionId: string,
  ): Promise<WalletDepositResponse> {
    // Validaciones
    if (amountUSD <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }

    if (!transactionId) {
      throw new Error('Transaction ID es requerido');
    }

    const supabase = this.supabaseService.getClient();

    // Obtener token de autenticación
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Usuario no autenticado');
    }

    // Obtener URL base de Supabase
    const supabaseUrl = this.getSupabaseUrl();
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/mercadopago-create-deposit-order`;

    // Llamar a Edge Function
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        amount_usd: amountUSD,
        transaction_id: transactionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.error || 'Error al crear orden de depósito en MercadoPago');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Error desconocido al crear orden de MercadoPago');
    }

    // Retornar en formato estándar WalletDepositResponse
    return {
      success: true,
      order_id: data.order_id,
      approval_url: data.init_point || data.approval_url,
      amount_usd: parseFloat(data.amount_usd),
      currency: data.currency || 'ARS',
      transaction_id: transactionId,
      provider: 'mercadopago',
    };
  }

  /**
   * Verifica si un depósito fue completado exitosamente
   *
   * Consulta la tabla wallet_transactions para verificar el estado.
   *
   * @param transactionId - ID de la transacción de wallet
   * @returns true si el depósito fue confirmado
   */
  async verifyDeposit(transactionId: string): Promise<boolean> {
    try {
      const supabase = this.supabaseService.getClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return false;

      // Consultar estado de la transacción
      const { data: transaction, error } = await supabase
        .from('wallet_transactions')
        .select('status, provider')
        .eq('id', transactionId)
        .eq('user_id', session.user.id)
        .eq('provider', 'mercadopago')
        .single();

      if (error || !transaction) {
        console.error('Error verifying MercadoPago deposit:', error);
        return false;
      }

      // La transacción es válida si está completada o confirmada
      return transaction.status === 'completed' || transaction.status === 'confirmed';
    } catch (err) {
      console.error('Error in verifyDeposit:', err);
      return false;
    }
  }

  /**
   * Obtiene el estado detallado de una transacción de depósito
   *
   * @param transactionId - ID de la transacción
   * @returns Objeto con estado y detalles de la transacción
   */
  async getDepositStatus(transactionId: string): Promise<{
    status: string;
    provider_transaction_id: string | null;
    amount: number;
    currency: string;
  } | null> {
    try {
      const supabase = this.supabaseService.getClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return null;

      const { data: transaction, error } = await supabase
        .from('wallet_transactions')
        .select('status, provider_transaction_id, amount, currency')
        .eq('id', transactionId)
        .eq('user_id', session.user.id)
        .single();

      if (error || !transaction) {
        return null;
      }

      return transaction;
    } catch (err) {
      console.error('Error getting deposit status:', err);
      return null;
    }
  }

  /**
   * Obtiene la URL base de Supabase
   */
  private getSupabaseUrl(): string {
    const supabase = this.supabaseService.getClient();
    // @ts-expect-error - Acceso interno al URL
    return supabase.supabaseUrl || '';
  }

  /**
   * Formatea errores para mostrar al usuario
   */
  private formatError(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Error al procesar el depósito con MercadoPago. Por favor intente nuevamente.';
  }
}
