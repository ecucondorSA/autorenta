import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Componente de advertencia sobre la garantía no reembolsable
 *
 * Muestra información clara sobre el sistema de garantía:
 * - Los fondos NO son reembolsables en cash
 * - Se DEVUELVEN al wallet del usuario (pueden reutilizarse)
 * - Útil para usuarios sin tarjeta de crédito
 */
@Component({
  selector: 'app-deposit-warning',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div
      class="bg-warning-50 dark:bg-warning-900/20 border-l-4 border-warning-500 p-6 mb-6 rounded-r-lg"
    >
      <div class="flex items-start">
        <!-- Icono de advertencia -->
        <svg
          class="w-6 h-6 text-amber-500 mr-4 flex-shrink-0 mt-1"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>

        <!-- Contenido -->
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-3">
            ⚠️ Importante: Sistema de Garantía No Reembolsable
          </h3>

          <div class="space-y-3 text-sm text-amber-700 dark:text-amber-400">
            <!-- Cómo funciona -->
            <div>
              <p class="font-semibold mb-2">🔍 ¿Cómo funciona?</p>
              <ul class="space-y-2 ml-4">
                <li class="flex items-start">
                  <span class="mr-2">•</span>
                  <span>
                    Debes garantizar el
                    <strong>monto del alquiler + depósito</strong> correspondiente al vehículo:
                    <strong>entre USD 300 y USD 900</strong> si usás la wallet de AutoRenta (Mercado
                    Pago) y <strong>entre USD 500 y USD 1.200</strong> si preferís tarjeta de
                    crédito.
                  </span>
                </li>
                <li class="flex items-start">
                  <span class="mr-2">•</span>
                  <span
                    >Al finalizar el alquiler <strong>sin daños</strong>, el propietario recibe el
                    pago del alquiler</span
                  >
                </li>
                <li class="flex items-start">
                  <span class="mr-2">•</span>
                  <span>
                    La garantía se libera según el método elegido: se desbloquea el hold de tu
                    tarjeta o vuelve el saldo bloqueado a tu wallet (no se deposita en tu cuenta
                    bancaria)
                  </span>
                </li>
              </ul>
            </div>

            <!-- Qué puedes hacer -->
            <div>
              <p class="font-semibold mb-2">✅ ¿Qué puedes hacer con la garantía devuelta?</p>
              <ul class="space-y-2 ml-4">
                <li class="flex items-start">
                  <span class="mr-2">✔</span>
                  <span>
                    Alquilar otro auto (solo necesitás agregar el monto del alquiler + el depósito
                    que corresponda a tu método de pago)
                  </span>
                </li>
                <li class="flex items-start">
                  <span class="mr-2">✔</span>
                  <span>Acumular fondos y alquilar autos frecuentemente</span>
                </li>
                <li class="flex items-start">
                  <span class="mr-2">✔</span>
                  <span>Usar tu saldo para pagar franquicias o daños menores</span>
                </li>
              </ul>
            </div>

            <!-- Qué NO puedes hacer -->
            <div>
              <p class="font-semibold mb-2 text-red-700 dark:text-red-400">
                ❌ ¿Qué NO puedes hacer?
              </p>
              <ul class="space-y-2 ml-4">
                <li class="flex items-start">
                  <span class="mr-2">✘</span>
                  <span class="text-red-700 dark:text-red-400"
                    ><strong>NO puedes retirar los fondos</strong> a tu cuenta bancaria</span
                  >
                </li>
                <li class="flex items-start">
                  <span class="mr-2">✘</span>
                  <span class="text-red-700 dark:text-red-400"
                    >NO se realizan devoluciones en efectivo</span
                  >
                </li>
              </ul>
            </div>

            <!-- Si hay daños -->
            <div>
              <p class="font-semibold mb-2">⚠️ En caso de daños al vehículo:</p>
              <ul class="space-y-2 ml-4">
                <li class="flex items-start">
                  <span class="mr-2">•</span>
                  <span>
                    El propietario puede cobrar los daños
                    <strong>del monto garantizado</strong> (hasta el depósito retenido según el
                    vehículo y método de pago)
                  </span>
                </li>
                <li class="flex items-start">
                  <span class="mr-2">•</span>
                  <span>
                    Si los daños son menores, recibís el
                    <strong>resto en tu wallet o en tu tarjeta</strong>
                  </span>
                </li>
                <li class="flex items-start">
                  <span class="mr-2">•</span>
                  <span>
                    Ejemplo: si te cobran USD 100 por un daño menor, se libera el resto del depósito
                    retenido cuando finaliza la reserva
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Callout de beneficio -->
          <div
            class="mt-4 p-4 bg-surface-raised dark:bg-surface-raised rounded-lg border border-amber-200 dark:border-amber-700"
          >
            <p class="text-sm font-medium text-slate-700 dark:text-slate-300">
              💡 <strong>Beneficio principal:</strong> Este sistema está diseñado para usuarios
              <strong>sin tarjeta de crédito</strong>. Los fondos quedan en tu cuenta de AutoRenta
              para futuros alquileres, creando un <strong>"crédito interno"</strong> que puedes
              reutilizar indefinidamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class DepositWarningComponent {}
