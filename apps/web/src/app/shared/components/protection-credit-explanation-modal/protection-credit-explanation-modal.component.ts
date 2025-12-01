import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

/**
 * ProtectionCreditExplanationModalComponent
 *
 * Modal educativo que explica el sistema de Crédito de Protección (CP).
 *
 * CONTENIDO:
 * - ¿Qué es el CP?
 * - ¿Cómo funciona?
 * - Lógica de cascada (CP → WR → Pago externo)
 * - Cómo obtener/renovar CP
 * - Preguntas frecuentes
 */

@Component({
  selector: 'app-protection-credit-explanation-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Crédito de Protección (CP)</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon slot="icon-only" name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- What is CP? -->
      <div class="section">
        <h2>¿Qué es el Crédito de Protección?</h2>
        <p>
          El <strong>Crédito de Protección (CP)</strong> es un saldo especial no retirable que
          AutoRenta otorga a conductores responsables para cubrir costos de siniestros (daños,
          robos, accidentes) durante sus reservas.
        </p>
        <ion-card class="info-card">
          <ion-card-content>
            <div class="info-content">
              <ion-icon name="information-circle-outline" color="primary"></ion-icon>
              <p>
                El CP <strong>no se puede retirar</strong> a tu cuenta bancaria. Solo se usa para
                cubrir siniestros.
              </p>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- How it works -->
      <div class="section">
        <h2>¿Cómo funciona?</h2>
        <p>
          Cuando ocurre un siniestro durante tu reserva, AutoRenta usa tus fondos en este orden:
        </p>

        <div class="waterfall-steps">
          <div class="waterfall-step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3>
                <ion-icon name="shield-checkmark-outline" color="primary"></ion-icon> Crédito de
                Protección (CP)
              </h3>
              <p>Se usa primero tu CP disponible (no retirable)</p>
            </div>
          </div>

          <ion-icon name="arrow-down-outline" class="arrow-icon"></ion-icon>

          <div class="waterfall-step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3>
                <ion-icon name="wallet-outline" color="success"></ion-icon> Wallet Regular (WR)
              </h3>
              <p>Si el CP no alcanza, se usa tu saldo retirable</p>
            </div>
          </div>

          <ion-icon name="arrow-down-outline" class="arrow-icon"></ion-icon>

          <div class="waterfall-step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3><ion-icon name="card-outline" color="warning"></ion-icon> Pago Externo</h3>
              <p>Si aún falta, pagas con tarjeta o efectivo</p>
            </div>
          </div>
        </div>
      </div>

      <!-- How to get CP -->
      <div class="section">
        <h2>¿Cómo obtener CP?</h2>

        <div class="benefit-item">
          <ion-icon name="gift-outline" color="success"></ion-icon>
          <div class="benefit-content">
            <h3>Bono inicial</h3>
            <p>Al registrarte, recibes <strong>$300 USD</strong> de CP gratis (válido 1 año)</p>
          </div>
        </div>

        <div class="benefit-item">
          <ion-icon name="sync-outline" color="primary"></ion-icon>
          <div class="benefit-content">
            <h3>Renovación gratuita</h3>
            <p>Completa <strong>10 reservas sin siniestros</strong> y renueva tu CP gratis</p>
          </div>
        </div>

        <div class="benefit-item">
          <ion-icon name="trophy-outline" color="warning"></ion-icon>
          <div class="benefit-content">
            <h3>Buen conductor</h3>
            <p>Mantén tu clase de conductor baja para recibir más CP en renovaciones</p>
          </div>
        </div>
      </div>

      <!-- Example -->
      <div class="section">
        <h2>Ejemplo Práctico</h2>
        <ion-card class="example-card">
          <ion-card-header>
            <ion-card-subtitle>Escenario: Daño de $500 USD</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <div class="example-row">
              <span>CP disponible:</span>
              <span class="value">$300 USD</span>
            </div>
            <div class="example-row">
              <span>Wallet retirable:</span>
              <span class="value">$150 USD</span>
            </div>
            <div class="example-separator"></div>
            <div class="example-breakdown">
              <p><strong>Distribución del pago:</strong></p>
              <div class="example-row highlight">
                <span>1. CP cubre:</span>
                <span class="value success">$300 USD</span>
              </div>
              <div class="example-row highlight">
                <span>2. Wallet cubre:</span>
                <span class="value success">$150 USD</span>
              </div>
              <div class="example-row highlight">
                <span>3. Tú pagas:</span>
                <span class="value warning">$50 USD</span>
              </div>
            </div>
            <p class="example-note">✅ Solo pagaste $50 en vez de $500 gracias al CP</p>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- FAQ -->
      <div class="section">
        <h2>Preguntas Frecuentes</h2>

        <ion-accordion-group>
          <ion-accordion value="expiration">
            <ion-item slot="header">
              <ion-label>¿Qué pasa si mi CP expira?</ion-label>
            </ion-item>
            <div slot="content" class="accordion-content">
              <p>
                Si tu CP expira sin usarlo, el saldo se reconoce como ingresos de AutoRenta
                (breakage revenue). Puedes renovarlo completando 10 reservas sin siniestros.
              </p>
            </div>
          </ion-accordion>

          <ion-accordion value="withdraw">
            <ion-item slot="header">
              <ion-label>¿Puedo retirar mi CP a mi banco?</ion-label>
            </ion-item>
            <div slot="content" class="accordion-content">
              <p>
                No. El CP es <strong>no retirable</strong> y solo se usa para cubrir siniestros.
                Está diseñado para protegerte en caso de incidentes.
              </p>
            </div>
          </ion-accordion>

          <ion-accordion value="lose">
            <ion-item slot="header">
              <ion-label>¿Pierdo CP si no lo uso?</ion-label>
            </ion-item>
            <div slot="content" class="accordion-content">
              <p>
                Si tu CP expira después de 1 año, sí. Pero si completas 10 reservas sin siniestros
                antes de que expire, se renueva automáticamente.
              </p>
            </div>
          </ion-accordion>

          <ion-accordion value="multiple">
            <ion-item slot="header">
              <ion-label>¿Puedo tener varios CP activos?</ion-label>
            </ion-item>
            <div slot="content" class="accordion-content">
              <p>
                No. Solo puedes tener un CP activo a la vez. Cuando renuevas, se suma al balance
                existente y se extiende la fecha de expiración.
              </p>
            </div>
          </ion-accordion>
        </ion-accordion-group>
      </div>

      <!-- Call to action -->
      <div class="section">
        <ion-card class="cta-card">
          <ion-card-content>
            <h3>💡 Consejo</h3>
            <p>
              Mantén un historial limpio de reservas para seguir disfrutando de tu CP. Cada
              renovación te da <strong>$300 USD</strong> adicionales de protección.
            </p>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-button expand="block" (click)="dismiss()"> Entendido </ion-button>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [
    `
      ion-content {
        --background: var(--ion-color-light);
      }

      .section {
        margin-bottom: 32px;
      }

      .section h2 {
        font-size: 1.3rem;
        font-weight: 600;
        margin-bottom: 16px;
        color: var(--ion-color-dark);
      }

      .section p {
        font-size: 1rem;
        line-height: 1.6;
        color: var(--ion-color-dark);
        margin-bottom: 16px;
      }

      /* Info Card */
      .info-card {
        background: var(--ion-color-primary-tint);
        box-shadow: none;
        margin: 16px 0;
      }

      .info-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .info-content ion-icon {
        font-size: 24px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .info-content p {
        margin: 0;
        font-size: 0.95rem;
      }

      /* Waterfall Steps */
      .waterfall-steps {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin: 24px 0;
      }

      .waterfall-step {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 16px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .step-number {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--ion-color-primary);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        flex-shrink: 0;
      }

      .step-content {
        flex: 1;
      }

      .step-content h3 {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--ion-color-dark);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .step-content h3 ion-icon {
        font-size: 20px;
      }

      .step-content p {
        font-size: 0.9rem;
        color: var(--ion-color-medium);
        margin: 0;
      }

      .arrow-icon {
        font-size: 24px;
        color: var(--ion-color-medium);
        align-self: center;
      }

      /* Benefit Items */
      .benefit-item {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 16px;
        background: white;
        border-radius: 8px;
        margin-bottom: 12px;
      }

      .benefit-item ion-icon {
        font-size: 32px;
        flex-shrink: 0;
      }

      .benefit-content h3 {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--ion-color-dark);
      }

      .benefit-content p {
        font-size: 0.9rem;
        color: var(--ion-color-medium);
        margin: 0;
      }

      /* Example Card */
      .example-card {
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .example-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 0.95rem;
      }

      .example-row .value {
        font-weight: 600;
      }

      .example-row.highlight {
        background: var(--ion-color-light);
        padding: 8px;
        border-radius: 4px;
      }

      .example-row .value.success {
        color: var(--ion-color-success);
      }

      .example-row .value.warning {
        color: var(--ion-color-warning);
      }

      .example-separator {
        height: 1px;
        background: var(--ion-color-medium);
        margin: 16px 0;
      }

      .example-breakdown {
        margin: 16px 0;
      }

      .example-breakdown p {
        margin-bottom: 12px;
      }

      .example-note {
        margin-top: 16px;
        padding: 12px;
        background: var(--ion-color-success-tint);
        border-radius: 8px;
        font-size: 0.95rem;
        color: var(--ion-color-success-shade);
        font-weight: 600;
      }

      /* Accordion */
      ion-accordion-group {
        margin: 16px 0;
      }

      .accordion-content {
        padding: 16px;
      }

      .accordion-content p {
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.6;
      }

      /* CTA Card */
      .cta-card {
        background-color: var(--ion-color-primary); /* Replaced gradient with solid color token */
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .cta-card h3 {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--ion-color-dark);
      }

      .cta-card p {
        font-size: 0.95rem;
        color: var(--ion-color-dark);
        margin: 0;
      }

      /* Footer */
      ion-footer {
        padding: 16px;
        background: white;
        box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
      }

      ion-footer ion-button {
        margin: 0;
      }
    `,
  ],
})
export class ProtectionCreditExplanationModalComponent {
  private readonly modalController = inject(ModalController);

  dismiss(): void {
    this.modalController.dismiss();
  }
}
