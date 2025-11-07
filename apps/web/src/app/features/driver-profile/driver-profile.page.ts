import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { DriverProfileCardComponent } from '../../shared/components/driver-profile-card/driver-profile-card.component';
import { ClassBenefitsModalComponent } from '../../shared/components/class-benefits-modal/class-benefits-modal.component';
import { MetaService } from '../../core/services/meta.service';

/**
 * DriverProfilePage
 *
 * Página dedicada que muestra el perfil de conductor del usuario.
 *
 * FEATURES:
 * - Muestra la tarjeta de perfil de conductor (driver-profile-card)
 * - Permite abrir el modal informativo (class-benefits-modal)
 * - Navegación rápida a Wallet y Protecciones
 * - SEO optimizado
 */

@Component({
  standalone: true,
  selector: 'app-driver-profile-page',
  imports: [
    CommonModule,
    IonicModule,
    RouterLink,
    DriverProfileCardComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/profile"></ion-back-button>
        </ion-buttons>
        <ion-title>Mi Perfil de Conductor</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openBenefitsModal()">
            <ion-icon slot="icon-only" name="information-circle-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Main Driver Profile Card -->
      <app-driver-profile-card></app-driver-profile-card>

      <!-- Additional Actions -->
      <div class="actions-section">
        <h2>Acciones Rápidas</h2>

        <ion-card>
          <ion-list lines="none">
            <ion-item button [routerLink]="['/wallet']">
              <ion-icon slot="start" name="wallet-outline" color="primary"></ion-icon>
              <ion-label>
                <h3>Ver mi Wallet</h3>
                <p>Revisa tu balance y transacciones</p>
              </ion-label>
              <ion-icon slot="end" name="chevron-forward-outline"></ion-icon>
            </ion-item>

            <ion-item button (click)="openBenefitsModal()">
              <ion-icon slot="start" name="information-circle-outline" color="secondary"></ion-icon>
              <ion-label>
                <h3>¿Cómo funciona el sistema?</h3>
                <p>Aprende sobre el sistema Bonus-Malus</p>
              </ion-label>
              <ion-icon slot="end" name="chevron-forward-outline"></ion-icon>
            </ion-item>

            <ion-item button [routerLink]="['/protections']">
              <ion-icon slot="start" name="shield-checkmark-outline" color="success"></ion-icon>
              <ion-label>
                <h3>Proteger mi Clase</h3>
                <p>Compra Bonus Protector para tu clase</p>
              </ion-label>
              <ion-icon slot="end" name="chevron-forward-outline"></ion-icon>
            </ion-item>
          </ion-list>
        </ion-card>
      </div>

      <!-- Info Section -->
      <div class="info-section">
        <ion-card class="info-card">
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="bulb-outline" color="warning"></ion-icon>
              Consejos
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ul>
              <li>Cada año sin siniestros mejora tu clase en 1 nivel</li>
              <li>Los siniestros sin responsabilidad NO afectan tu clase</li>
              <li>El Bonus Protector puede salvarte de subir de clase</li>
              <li>Mantén un buen score telemático para mejores beneficios</li>
            </ul>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [
    `
      ion-header ion-toolbar {
        --background: var(--ion-color-primary);
        --color: white;
      }

      ion-back-button {
        --color: white;
      }

      ion-content {
        --background: var(--ion-background-color, #f5f5f5);
      }

      .actions-section,
      .info-section {
        margin-top: 24px;
      }

      .actions-section h2 {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 12px;
        padding: 0 16px;
        color: var(--ion-color-dark);
      }

      .actions-section ion-card {
        margin: 0 16px;
      }

      .actions-section ion-item {
        --padding-start: 16px;
        --padding-end: 16px;
        --inner-padding-end: 0;
        margin-bottom: 8px;
      }

      .actions-section ion-item h3 {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--ion-color-dark);
      }

      .actions-section ion-item p {
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        margin: 0;
      }

      .info-card {
        margin: 0 16px;
      }

      .info-card ion-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1rem;
        font-weight: 600;
      }

      .info-card ul {
        margin: 0;
        padding-left: 20px;
      }

      .info-card li {
        font-size: 0.9rem;
        line-height: 1.6;
        margin-bottom: 8px;
        color: var(--ion-color-dark);
      }

      .info-card li:last-child {
        margin-bottom: 0;
      }
    `,
  ],
})
export class DriverProfilePage implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly metaService = inject(MetaService);

  ngOnInit(): void {
    this.updateMeta();
  }

  async openBenefitsModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: ClassBenefitsModalComponent,
    });

    await modal.present();
  }

  private updateMeta(): void {
    this.metaService.updateTags({
      title: 'Mi Perfil de Conductor - AutoRenta',
      description: 'Revisa tu clase de conductor, beneficios y descuentos en el sistema Bonus-Malus.',
      keywords: 'perfil conductor, bonus malus, descuentos, clase conductor',
    });
  }
}
