import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { DriverProfileService, ClassBenefits } from '../../../core/services/driver-profile.service';

/**
 * ClassBenefitsModalComponent
 *
 * Modal educativo que explica el sistema de clases Bonus-Malus.
 *
 * CONTENIDO:
 * - Explicación del sistema (qué es, cómo funciona)
 * - Tabla completa de clases (0-10)
 * - Beneficios (descuentos) y recargos por clase
 * - Cómo mejorar de clase
 * - Cómo se pierde clase (siniestros)
 * - Ejemplos prácticos
 *
 * USO:
 * ```typescript
 * const modal = await modalController.create({
 *   component: ClassBenefitsModalComponent,
 * });
 * await modal.present();
 * ```
 */

@Component({
  selector: 'app-class-benefits-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Sistema de Clases Bonus-Malus</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-container">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Cargando información...</p>
      </div>

      <!-- Content -->
      <div *ngIf="!loading()">
        <!-- Intro Section -->
        <div class="intro-section">
          <h2>
            <ion-icon name="information-circle-outline" color="primary"></ion-icon>
            ¿Qué es el Sistema Bonus-Malus?
          </h2>
          <p>
            El sistema Bonus-Malus es un mecanismo de incentivos que premia a los conductores
            responsables con descuentos y penaliza a quienes tienen siniestros frecuentes con recargos.
          </p>
          <p>
            Tu <strong>clase de conductor</strong> va de 0 (excelente) a 10 (alto riesgo) y determina
            tus tarifas de servicio y garantía.
          </p>
        </div>

        <!-- How it Works -->
        <div class="how-it-works-section">
          <h3>
            <ion-icon name="cog-outline" color="primary"></ion-icon>
            ¿Cómo funciona?
          </h3>

          <ion-card class="info-card">
            <ion-card-content>
              <h4>🟢 Mejorar tu Clase (Bonus)</h4>
              <ul>
                <li>1 año sin siniestros con responsabilidad → <strong>-1 clase</strong></li>
                <li>Mínimo: Clase 0 (máximo descuento)</li>
                <li>Los siniestros sin responsabilidad NO afectan tu clase</li>
              </ul>
            </ion-card-content>
          </ion-card>

          <ion-card class="warning-card">
            <ion-card-content>
              <h4>🔴 Empeorar tu Clase (Malus)</h4>
              <ul>
                <li>Siniestro leve con responsabilidad → <strong>+1 clase</strong></li>
                <li>Siniestro moderado con responsabilidad → <strong>+2 clases</strong></li>
                <li>Siniestro grave con responsabilidad → <strong>+3 clases</strong></li>
                <li>Máximo: Clase 10 (máximo recargo)</li>
              </ul>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Benefits Table -->
        <div class="table-section">
          <h3>
            <ion-icon name="list-outline" color="primary"></ion-icon>
            Tabla de Beneficios
          </h3>

          <div class="table-scroll">
            <table class="benefits-table">
              <thead>
                <tr>
                  <th>Clase</th>
                  <th>Descripción</th>
                  <th>Tarifa</th>
                  <th>Garantía</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  *ngFor="let benefit of allBenefits()"
                  [class.current]="benefit.class === currentClass()"
                  [class.excellent]="benefit.class <= 2"
                  [class.good]="benefit.class > 2 && benefit.class <= 4"
                  [class.base]="benefit.class === 5"
                  [class.risk]="benefit.class > 5 && benefit.class <= 7"
                  [class.high-risk]="benefit.class > 7"
                >
                  <td>
                    <ion-badge [color]="getClassColor(benefit.class)">
                      {{ benefit.class }}
                    </ion-badge>
                  </td>
                  <td>{{ benefit.description }}</td>
                  <td [class.discount]="benefit.is_discount" [class.surcharge]="!benefit.is_discount && benefit.class !== 5">
                    {{ formatPercent(benefit.fee_discount_pct) }}
                  </td>
                  <td [class.discount]="benefit.is_discount" [class.surcharge]="!benefit.is_discount && benefit.class !== 5">
                    {{ formatPercent(benefit.guarantee_discount_pct) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="table-note">
            <ion-icon name="star-outline" color="primary"></ion-icon>
            La fila resaltada es tu clase actual.
          </p>
        </div>

        <!-- Examples Section -->
        <div class="examples-section">
          <h3>
            <ion-icon name="calculator-outline" color="primary"></ion-icon>
            Ejemplos Prácticos
          </h3>

          <ion-card class="example-card">
            <ion-card-header>
              <ion-card-title>Ejemplo 1: Conductor Excelente (Clase 0)</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p><strong>Escenario:</strong> Booking de $100 USD tarifa, $1000 USD garantía</p>
              <div class="example-calculation">
                <div class="calc-row">
                  <span>Tarifa base:</span>
                  <span>$100 USD</span>
                </div>
                <div class="calc-row discount">
                  <span>Descuento Clase 0 (-15%):</span>
                  <span>-$15 USD</span>
                </div>
                <div class="calc-row total">
                  <span>Tarifa final:</span>
                  <span>$85 USD</span>
                </div>
              </div>
              <div class="example-calculation">
                <div class="calc-row">
                  <span>Garantía base:</span>
                  <span>$1000 USD</span>
                </div>
                <div class="calc-row discount">
                  <span>Descuento Clase 0 (-25%):</span>
                  <span>-$250 USD</span>
                </div>
                <div class="calc-row total">
                  <span>Garantía final:</span>
                  <span>$750 USD</span>
                </div>
              </div>
              <p class="example-note">
                <ion-icon name="trophy-outline" color="success"></ion-icon>
                ¡Ahorro total de $265 USD por este booking!
              </p>
            </ion-card-content>
          </ion-card>

          <ion-card class="example-card">
            <ion-card-header>
              <ion-card-title>Ejemplo 2: Alto Riesgo (Clase 10)</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p><strong>Escenario:</strong> Booking de $100 USD tarifa, $1000 USD garantía</p>
              <div class="example-calculation">
                <div class="calc-row">
                  <span>Tarifa base:</span>
                  <span>$100 USD</span>
                </div>
                <div class="calc-row surcharge">
                  <span>Recargo Clase 10 (+20%):</span>
                  <span>+$20 USD</span>
                </div>
                <div class="calc-row total">
                  <span>Tarifa final:</span>
                  <span>$120 USD</span>
                </div>
              </div>
              <div class="example-calculation">
                <div class="calc-row">
                  <span>Garantía base:</span>
                  <span>$1000 USD</span>
                </div>
                <div class="calc-row surcharge">
                  <span>Recargo Clase 10 (+80%):</span>
                  <span>+$800 USD</span>
                </div>
                <div class="calc-row total">
                  <span>Garantía final:</span>
                  <span>$1800 USD</span>
                </div>
              </div>
              <p class="example-note">
                <ion-icon name="alert-outline" color="danger"></ion-icon>
                Costo adicional de $820 USD por este booking
              </p>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Tips Section -->
        <div class="tips-section">
          <h3>
            <ion-icon name="bulb-outline" color="primary"></ion-icon>
            Consejos para Mejorar tu Clase
          </h3>

          <ion-list>
            <ion-item>
              <ion-icon slot="start" name="car-outline" color="success"></ion-icon>
              <ion-label class="ion-text-wrap">
                <strong>Conduce con precaución</strong>
                <p>Evita siniestros y mantén un buen score telemático</p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-icon slot="start" name="shield-checkmark-outline" color="primary"></ion-icon>
              <ion-label class="ion-text-wrap">
                <strong>Compra Protector de Bonus</strong>
                <p>Protege tu clase de subir en caso de siniestros ($15-$40 USD)</p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-icon slot="start" name="time-outline" color="warning"></ion-icon>
              <ion-label class="ion-text-wrap">
                <strong>Ten paciencia</strong>
                <p>Cada año sin siniestros mejora tu clase en 1 nivel</p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-icon slot="start" name="analytics-outline" color="secondary"></ion-icon>
              <ion-label class="ion-text-wrap">
                <strong>Monitorea tu telemetría</strong>
                <p>Buen score telemático puede acelerar mejoras futuras</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </div>

        <!-- CTA Section -->
        <div class="cta-section">
          <ion-button expand="block" color="primary" (click)="dismiss()">
            <ion-icon slot="start" name="checkmark-outline"></ion-icon>
            Entendido
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      ion-header ion-toolbar {
        --background: var(--ion-color-primary);
        --color: white;
      }

      ion-title {
        font-size: 1.1rem;
      }

      /* Loading */
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 64px;
        text-align: center;
      }

      .loading-container ion-spinner {
        margin-bottom: 16px;
      }

      /* Sections */
      .intro-section,
      .how-it-works-section,
      .table-section,
      .examples-section,
      .tips-section,
      .cta-section {
        margin-bottom: 32px;
      }

      h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.3rem;
        font-weight: 700;
        margin-bottom: 16px;
        color: var(--ion-color-dark);
      }

      h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 16px;
        color: var(--ion-color-dark);
      }

      p {
        font-size: 0.95rem;
        line-height: 1.6;
        color: var(--ion-color-dark);
        margin-bottom: 12px;
      }

      /* Info Cards */
      .info-card,
      .warning-card {
        margin-bottom: 12px;
      }

      .info-card {
        background: var(--ion-color-success-tint);
      }

      .warning-card {
        background: var(--ion-color-danger-tint);
      }

      .info-card h4,
      .warning-card h4 {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 8px;
      }

      .info-card ul,
      .warning-card ul {
        margin: 0;
        padding-left: 20px;
      }

      .info-card li,
      .warning-card li {
        font-size: 0.9rem;
        margin-bottom: 6px;
      }

      /* Benefits Table */
      .table-scroll {
        overflow-x: auto;
        margin-bottom: 12px;
      }

      .benefits-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
      }

      .benefits-table thead {
        background: var(--ion-color-light);
      }

      .benefits-table th {
        padding: 12px 8px;
        text-align: left;
        font-weight: 600;
        color: var(--ion-color-dark);
        border-bottom: 2px solid var(--ion-color-medium);
      }

      .benefits-table td {
        padding: 10px 8px;
        border-bottom: 1px solid var(--ion-color-light);
      }

      .benefits-table tr.current {
        background: var(--ion-color-primary-tint);
        border-left: 4px solid var(--ion-color-primary);
      }

      .benefits-table tr.excellent {
        background: rgba(16, 220, 96, 0.1);
      }

      .benefits-table tr.good {
        background: rgba(66, 140, 255, 0.1);
      }

      .benefits-table tr.risk {
        background: rgba(255, 206, 0, 0.1);
      }

      .benefits-table tr.high-risk {
        background: rgba(235, 68, 90, 0.1);
      }

      .discount {
        color: var(--ion-color-success);
        font-weight: 600;
      }

      .surcharge {
        color: var(--ion-color-danger);
        font-weight: 600;
      }

      .table-note {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        font-style: italic;
      }

      /* Example Cards */
      .example-card {
        margin-bottom: 16px;
      }

      .example-card ion-card-title {
        font-size: 1rem;
      }

      .example-calculation {
        background: var(--ion-color-light);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
      }

      .calc-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        font-size: 0.9rem;
      }

      .calc-row.discount {
        color: var(--ion-color-success);
        font-weight: 600;
      }

      .calc-row.surcharge {
        color: var(--ion-color-danger);
        font-weight: 600;
      }

      .calc-row.total {
        border-top: 2px solid var(--ion-color-medium);
        margin-top: 6px;
        padding-top: 12px;
        font-size: 1rem;
        font-weight: 700;
      }

      .example-note {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        margin: 12px 0 0 0;
      }

      /* Tips Section */
      .tips-section ion-list {
        background: transparent;
      }

      .tips-section ion-item {
        --background: var(--ion-color-light);
        --border-radius: 8px;
        margin-bottom: 8px;
      }

      .tips-section ion-label strong {
        font-size: 0.95rem;
        color: var(--ion-color-dark);
      }

      .tips-section ion-label p {
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        margin-top: 4px;
      }

      /* CTA Section */
      .cta-section {
        padding-top: 16px;
      }
    `,
  ],
})
export class ClassBenefitsModalComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly driverProfileService = inject(DriverProfileService);

  readonly loading = signal(true);
  readonly allBenefits = signal<ClassBenefits[]>([]);
  readonly currentClass = signal(5);

  async ngOnInit(): Promise<void> {
    await this.loadBenefits();
  }

  async loadBenefits(): Promise<void> {
    this.loading.set(true);

    try {
      // Load current profile
      await this.driverProfileService.loadProfile();
      this.currentClass.set(this.driverProfileService.driverClass());

      // Load all class benefits
      const benefits = await this.driverProfileService.getAllClassBenefits();
      this.allBenefits.set(benefits);
    } catch (error) {
      console.error('[ClassBenefitsModal] Error al cargar beneficios:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getClassColor(classNum: number): string {
    if (classNum <= 2) return 'success';
    if (classNum <= 4) return 'primary';
    if (classNum === 5) return 'medium';
    if (classNum <= 7) return 'warning';
    return 'danger';
  }

  formatPercent(value: number): string {
    if (value === 0) return '0%';
    const sign = value > 0 ? '-' : '+';
    return `${sign}${Math.abs(value)}%`;
  }

  dismiss(): void {
    this.modalController.dismiss();
  }
}
