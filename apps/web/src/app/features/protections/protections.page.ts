import {Component, inject, OnInit, computed,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { BonusProtectorPurchaseComponent } from '../../shared/components/bonus-protector-purchase/bonus-protector-purchase.component';
import { MetaService } from '../../core/services/meta.service';
import { WalletService } from '../../core/services/wallet.service';

/**
 * ProtectionsPage
 *
 * Página dedicada para gestión centralizada de protecciones y seguros.
 *
 * FEATURES:
 * - Bonus Protector (protege clase de conductor)
 * - Información sobre seguros de vehículos
 * - Gestión de protecciones activas
 * - Educación sobre opciones de protección
 */

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-protections-page',
  imports: [CommonModule, IonicModule, RouterLink, BonusProtectorPurchaseComponent, CurrencyPipe],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/profile"></ion-back-button>
        </ion-buttons>
        <ion-title>Protecciones</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Header Section -->
      <div class="header-section">
        <h1>Protecciones y Seguros</h1>
        <p class="subtitle">
          Protege tu clase de conductor y tu vehículo con nuestras opciones de cobertura.
        </p>
      </div>

      <!-- Wallet Balance Card -->
      <div class="wallet-balance-section">
        <ion-card class="wallet-card">
          <ion-card-content>
            <div class="wallet-info">
              <div class="wallet-icon">
                <ion-icon name="wallet-outline" color="primary"></ion-icon>
              </div>
              <div class="wallet-details">
                <span class="wallet-label">Saldo disponible</span>
                <span class="wallet-amount">{{ walletBalance() | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
              <ion-button size="small" fill="outline" [routerLink]="['/wallet']">
                <ion-icon slot="start" name="add-outline"></ion-icon>
                Depositar
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Bonus Protector Section -->
      <div class="section-container">
        <div class="section-header">
          <h2>
            <ion-icon name="shield-checkmark-outline" color="primary"></ion-icon>
            Protector de Bonus
          </h2>
          <p class="section-description">
            Protege tu clase de conductor de subir en caso de siniestros. Ideal para mantener tus
            descuentos y evitar recargos.
          </p>
        </div>

        <!-- Bonus Protector Purchase Component -->
        <app-bonus-protector-purchase></app-bonus-protector-purchase>
      </div>

      <!-- Vehicle Insurance Section -->
      <div class="section-container">
        <div class="section-header">
          <h2>
            <ion-icon name="car-outline" color="secondary"></ion-icon>
            Seguros de Vehículo
          </h2>
          <p class="section-description">
            Información sobre las coberturas de seguro requeridas para publicar tu vehículo.
          </p>
        </div>

        <ion-card class="info-card">
          <ion-card-content>
            <h3>Requisitos de Seguro</h3>
            <ul class="requirements-list">
              <li>
                <ion-icon name="checkmark-circle-outline" color="success"></ion-icon>
                <span>Responsabilidad Civil obligatoria</span>
              </li>
              <li>
                <ion-icon name="checkmark-circle-outline" color="success"></ion-icon>
                <span>Cobertura contra terceros recomendada</span>
              </li>
              <li>
                <ion-icon name="checkmark-circle-outline" color="success"></ion-icon>
                <span>Cobertura completa opcional pero sugerida</span>
              </li>
            </ul>

            <p class="note">
              <ion-icon name="information-circle-outline" color="primary"></ion-icon>
              Como locador, tu seguro debe estar al día para publicar vehículos en la plataforma.
            </p>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Quick Links -->
      <div class="quick-links-section">
        <h3>Enlaces Rápidos</h3>

        <ion-list lines="none">
          <ion-item button [routerLink]="['/profile/driver-profile']">
            <ion-icon slot="start" name="person-circle-outline" color="primary"></ion-icon>
            <ion-label>
              <h4>Mi Perfil de Conductor</h4>
              <p>Ver mi clase y beneficios actuales</p>
            </ion-label>
            <ion-icon slot="end" name="chevron-forward-outline"></ion-icon>
          </ion-item>

          <ion-item button [routerLink]="['/wallet']">
            <ion-icon slot="start" name="wallet-outline" color="secondary"></ion-icon>
            <ion-label>
              <h4>Mi Wallet</h4>
              <p>Gestionar fondos para protecciones</p>
            </ion-label>
            <ion-icon slot="end" name="chevron-forward-outline"></ion-icon>
          </ion-item>

          <ion-item button [routerLink]="['/profile']" [queryParams]="{ tab: 'conductor' }">
            <ion-icon slot="start" name="settings-outline" color="tertiary"></ion-icon>
            <ion-label>
              <h4>Configuración de Conductor</h4>
              <p>Ajustes de perfil y preferencias</p>
            </ion-label>
            <ion-icon slot="end" name="chevron-forward-outline"></ion-icon>
          </ion-item>
        </ion-list>
      </div>

      <!-- Help Section -->
      <div class="help-section">
        <ion-card class="help-card">
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="help-circle-outline" color="warning"></ion-icon>
              ¿Necesitas ayuda?
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>
              Si tienes dudas sobre nuestras protecciones o seguros, contacta a nuestro equipo de
              soporte.
            </p>
            <ion-button expand="block" fill="outline" color="primary">
              <ion-icon slot="start" name="mail-outline"></ion-icon>
              Contactar Soporte
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [
    `
      :host {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        contain: layout size style;
      }

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

      .header-section {
        text-align: center;
        padding: 2rem 1rem 1.5rem;
      }

      .header-section h1 {
        font-size: 2rem;
        font-weight: 700;
        color: var(--ion-color-dark);
        margin-bottom: 0.5rem;
      }

      .subtitle {
        font-size: 1rem;
        color: var(--ion-color-medium);
        line-height: 1.5;
        max-width: 600px;
        margin: 0 auto;
      }

      .wallet-balance-section {
        padding: 0 1rem;
        margin-bottom: 1.5rem;
      }

      .wallet-card {
        margin: 0;
        background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
        border: 1px solid #0ea5e9;
      }

      .wallet-info {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .wallet-icon {
        width: 48px;
        height: 48px;
        background: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .wallet-icon ion-icon {
        font-size: 1.5rem;
      }

      .wallet-details {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .wallet-label {
        font-size: 0.85rem;
        color: #0369a1;
      }

      .wallet-amount {
        font-size: 1.5rem;
        font-weight: 700;
        color: #0c4a6e;
      }

      .section-container {
        margin-bottom: 2rem;
        padding: 0 1rem;
      }

      .section-header {
        margin-bottom: 1.5rem;
      }

      .section-header h2 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--ion-color-dark);
        margin-bottom: 0.5rem;
      }

      .section-description {
        font-size: 0.95rem;
        color: var(--ion-color-medium);
        line-height: 1.5;
      }

      .info-card {
        margin: 1rem 0;
      }

      .info-card h3 {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--ion-color-dark);
        margin-bottom: 1rem;
      }

      .requirements-list {
        list-style: none;
        padding: 0;
        margin: 0 0 1rem 0;
      }

      .requirements-list li {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 0;
        font-size: 0.95rem;
        color: var(--ion-color-dark);
      }

      .requirements-list ion-icon {
        font-size: 1.25rem;
      }

      .note {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        padding: 1rem;
        background-color: var(--ion-color-primary-tint);
        border-radius: 8px;
        font-size: 0.875rem;
        color: var(--ion-color-primary-shade);
        margin: 0;
      }

      .note ion-icon {
        font-size: 1.25rem;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .quick-links-section {
        padding: 0 1rem;
        margin-bottom: 2rem;
      }

      .quick-links-section h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--ion-color-dark);
        margin-bottom: 1rem;
      }

      .quick-links-section ion-list {
        background: transparent;
      }

      .quick-links-section ion-item {
        --background: white;
        --border-radius: 12px;
        margin-bottom: 0.75rem;
        --padding-start: 16px;
        --padding-end: 16px;
      }

      .quick-links-section ion-label h4 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--ion-color-dark);
        margin-bottom: 0.25rem;
      }

      .quick-links-section ion-label p {
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        margin: 0;
      }

      .help-section {
        padding: 0 1rem 2rem;
      }

      .help-card {
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        border: 1px solid #fbbf24;
      }

      .help-card ion-card-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.125rem;
        color: #78350f;
      }

      .help-card ion-card-content p {
        color: #78350f;
        margin-bottom: 1rem;
      }
    `,
  ],
})
export class ProtectionsPage implements OnInit {
  private readonly metaService = inject(MetaService);
  private readonly walletService = inject(WalletService);

  readonly walletBalance = computed(() => this.walletService.availableBalance());

  ngOnInit(): void {
    this.updateMeta();
    this.loadWalletBalance();
  }

  private async loadWalletBalance(): Promise<void> {
    try {
      await this.walletService.fetchBalance();
    } catch {
      // Silently fail - balance will show as 0
    }
  }

  private updateMeta(): void {
    this.metaService.updateMeta({
      title: 'Protecciones y Seguros - AutoRenta',
      description:
        'Protege tu clase de conductor y tu vehículo con nuestras opciones de cobertura.',
      keywords: 'protecciones, seguros, bonus protector, seguro vehicular',
    });
  }
}
