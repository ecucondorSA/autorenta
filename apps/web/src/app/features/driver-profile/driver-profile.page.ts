import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { DriverProfileService } from '../../core/services/driver-profile.service';
import { BonusProtectorService } from '../../core/services/bonus-protector.service';
import { ClassBenefitsModalComponent } from '../../shared/components/class-benefits-modal/class-benefits-modal.component';
import { MetaService } from '../../core/services/meta.service';

/**
 * DriverProfilePage - Perfil de Conductor Estilo Aseguradora
 *
 * Página dedicada con diseño profesional de seguros que muestra:
 * - Dashboard visual con clase actual y beneficios
 * - Score telemático con gráficos
 * - Historial detallado de siniestros
 * - Sistema Bonus-Malus explicado visualmente
 * - Estado de protecciones activas
 * - Comparativa con otras clases
 */

@Component({
  standalone: true,
  selector: 'app-driver-profile-page',
  imports: [CommonModule, IonicModule, RouterLink],
  template: `
    <ion-header class="header-primary">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/profile" color="light"></ion-back-button>
        </ion-buttons>
        <ion-title>Mi Perfil de Conductor</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" color="light" (click)="showSystemExplanation()">
            <ion-icon slot="icon-only" name="help-circle-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="profile-content">
      <!-- Loading State -->
      <div *ngIf="driverService.loading()" class="loading-section">
        <ion-card>
          <ion-card-content class="loading-content">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p>Cargando tu perfil de conductor...</p>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Profile Loaded -->
      <div *ngIf="!driverService.loading() && profile()">
        <!-- Hero Section - Class Overview -->
        <div class="hero-section">
          <ion-card class="hero-card">
            <ion-card-content>
              <div class="hero-content">
                <div class="class-display">
                  <div class="class-badge" [class]="getClassStyle()">
                    <div class="class-number">{{ driverClass() }}</div>
                    <div class="class-label">CLASE</div>
                  </div>
                  <div class="class-info">
                    <h1>{{ getClassTitle() }}</h1>
                    <p class="class-description">{{ classDescription() }}</p>
                    <div class="benefit-highlight" [class]="getBenefitStyle()">
                      <ion-icon [name]="getBenefitIcon()"></ion-icon>
                      <span>{{ getBenefitText() }}</span>
                    </div>
                  </div>
                </div>

                <!-- Status Indicator -->
                <div class="status-indicator">
                  <div class="status-dot" [class]="getStatusColor()"></div>
                  <span class="status-text">{{ getStatusText() }}</span>
                </div>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Protection Status -->
        <div class="protection-section" *ngIf="!bonusProtectorService.loading()">
          <ion-card class="protection-card" [class]="getProtectionCardStyle()">
            <ion-card-content>
              <div class="protection-header">
                <ion-icon
                  [name]="getProtectionIcon()"
                  [color]="getProtectionIconColor()"
                ></ion-icon>
                <div class="protection-info">
                  <h3>{{ getProtectionTitle() }}</h3>
                  <p>{{ getProtectionMessage() }}</p>
                </div>
                <ion-button
                  *ngIf="needsProtection()"
                  fill="solid"
                  size="small"
                  (click)="buyProtection()"
                >
                  Proteger
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Score Telemático -->
        <div class="score-section">
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="analytics-outline" color="primary"></ion-icon>
                Score Telemático
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="score-display">
                <div class="score-gauge">
                  <svg viewBox="0 0 200 120" class="gauge-svg">
                    <!-- Background arc -->
                    <path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      stroke="#e0e0e0"
                      stroke-width="20"
                      fill="none"
                    ></path>
                    <!-- Score arc -->
                    <path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      [attr.stroke]="getScoreColor()"
                      stroke-width="20"
                      fill="none"
                      [attr.stroke-dasharray]="getScoreArcLength()"
                      [attr.stroke-dashoffset]="getScoreArcOffset()"
                      class="score-arc"
                    ></path>
                  </svg>
                  <div class="score-number">
                    <span class="score-value">{{ driverScore() }}</span>
                    <span class="score-max">/100</span>
                  </div>
                </div>
                <div class="score-breakdown">
                  <div class="score-category">
                    <div class="category-bar">
                      <div
                        class="bar-fill"
                        [style.width]="getSpeedScore() + '%'"
                        style="background: #3880ff;"
                      ></div>
                    </div>
                    <span>Velocidad: {{ getSpeedScore() }}%</span>
                  </div>
                  <div class="score-category">
                    <div class="category-bar">
                      <div
                        class="bar-fill"
                        [style.width]="getBrakingScore() + '%'"
                        style="background: #2dd36f;"
                      ></div>
                    </div>
                    <span>Frenado: {{ getBrakingScore() }}%</span>
                  </div>
                  <div class="score-category">
                    <div class="category-bar">
                      <div
                        class="bar-fill"
                        [style.width]="getAccelerationScore() + '%'"
                        style="background: #ffc409;"
                      ></div>
                    </div>
                    <span>Aceleración: {{ getAccelerationScore() }}%</span>
                  </div>
                </div>
              </div>
              <p class="score-message">{{ getScoreMessage() }}</p>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Benefits Comparison -->
        <div class="benefits-section">
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="trophy-outline" color="warning"></ion-icon>
                Tus Beneficios Actuales
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="benefits-grid">
                <div class="benefit-item" [class]="getFeeStyle()">
                  <div class="benefit-icon">
                    <ion-icon [name]="getFeeIcon()"></ion-icon>
                  </div>
                  <div class="benefit-content">
                    <h4>Tarifa de Servicio</h4>
                    <p class="benefit-value">{{ getFeeText() }}</p>
                    <p class="benefit-description">{{ getFeeDescription() }}</p>
                  </div>
                </div>

                <div class="benefit-item" [class]="getGuaranteeStyle()">
                  <div class="benefit-icon">
                    <ion-icon [name]="getGuaranteeIcon()"></ion-icon>
                  </div>
                  <div class="benefit-content">
                    <h4>Garantía</h4>
                    <p class="benefit-value">{{ getGuaranteeText() }}</p>
                    <p class="benefit-description">{{ getGuaranteeDescription() }}</p>
                  </div>
                </div>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Claims History -->
        <div class="claims-section">
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="document-text-outline" color="medium"></ion-icon>
                Historial de Siniestros
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="claims-overview">
                <div class="claim-metric">
                  <div class="metric-number total">{{ profile()?.total_claims || 0 }}</div>
                  <p>Total de Siniestros</p>
                </div>
                <div class="claim-metric">
                  <div class="metric-number fault">{{ profile()?.claims_with_fault || 0 }}</div>
                  <p>Con Responsabilidad</p>
                </div>
                <div class="claim-metric">
                  <div class="metric-number good">{{ profile()?.good_years || 0 }}</div>
                  <p>Años Sin Siniestros</p>
                </div>
              </div>

              <div class="claims-timeline" *ngIf="profile()?.last_claim_at">
                <div class="timeline-item">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <h4>Último Siniestro</h4>
                    <p>{{ formatDate(profile()?.last_claim_at) }}</p>
                    <ion-badge [color]="profile()?.last_claim_with_fault ? 'danger' : 'medium'">
                      {{
                        profile()?.last_claim_with_fault
                          ? 'Con responsabilidad'
                          : 'Sin responsabilidad'
                      }}
                    </ion-badge>
                  </div>
                </div>
              </div>

              <div class="no-claims" *ngIf="!profile()?.total_claims">
                <ion-icon name="checkmark-circle-outline" color="success"></ion-icon>
                <p>¡Excelente! No tienes siniestros registrados</p>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Class Progression -->
        <div class="progression-section">
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="trending-up-outline" color="success"></ion-icon>
                Progreso de Clase
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="class-ladder">
                <div
                  class="ladder-item"
                  *ngFor="let classItem of getClassLadder()"
                  [class.current]="classItem.class === driverClass()"
                  [class.better]="classItem.class < driverClass()"
                  [class.worse]="classItem.class > driverClass()"
                >
                  <div class="ladder-class">{{ classItem.class }}</div>
                  <div class="ladder-info">
                    <h4>{{ classItem.title }}</h4>
                    <p>{{ classItem.benefit }}</p>
                  </div>
                  <div class="ladder-status">
                    <ion-icon
                      *ngIf="classItem.class === driverClass()"
                      name="location"
                      color="primary"
                    ></ion-icon>
                    <ion-icon
                      *ngIf="classItem.class < driverClass()"
                      name="arrow-up"
                      color="success"
                    ></ion-icon>
                    <ion-icon
                      *ngIf="classItem.class > driverClass()"
                      name="arrow-down"
                      color="danger"
                    ></ion-icon>
                  </div>
                </div>
              </div>

              <div class="progression-message" *ngIf="canImprove()">
                <ion-icon name="information-circle-outline" color="primary"></ion-icon>
                <p>
                  Mantén un historial limpio por
                  <strong>{{ yearsToImprove() }} año{{ yearsToImprove() > 1 ? 's' : '' }}</strong>
                  para mejorar a Clase {{ getNextBetterClass() }}
                </p>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Quick Actions -->
        <div class="actions-section">
          <ion-grid>
            <ion-row>
              <ion-col size="6">
                <ion-button expand="block" fill="outline" [routerLink]="['/wallet']">
                  <ion-icon slot="start" name="wallet-outline"></ion-icon>
                  Mi Wallet
                </ion-button>
              </ion-col>
              <ion-col size="6">
                <ion-button expand="block" fill="outline" [routerLink]="['/protections']">
                  <ion-icon slot="start" name="shield-checkmark-outline"></ion-icon>
                  Proteger
                </ion-button>
              </ion-col>
            </ion-row>
          </ion-grid>
        </div>
      </div>

      <!-- No Profile State -->
      <div *ngIf="!driverService.loading() && !profile()" class="no-profile-section">
        <ion-card>
          <ion-card-content class="no-profile-content">
            <ion-icon name="person-add-outline" color="medium"></ion-icon>
            <h2>Crear Perfil de Conductor</h2>
            <p>Inicia tu perfil de riesgo para acceder a beneficios y descuentos</p>
            <ion-button expand="block" (click)="initializeProfile()"> Crear Perfil </ion-button>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [
    `
      /* ===== GLOBAL VARIABLES ===== */
      :host {
        --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        --gradient-success: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        --gradient-warning: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        --gradient-danger: linear-gradient(135deg, #fc466b 0%, #3f5efb 100%);
        --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.08);
        --shadow-medium: 0 8px 32px rgba(0, 0, 0, 0.12);
        --shadow-strong: 0 12px 48px rgba(0, 0, 0, 0.15);
        --border-radius: 16px;
        --border-radius-large: 24px;
        --spacing-xs: 4px;
        --spacing-sm: 8px;
        --spacing-md: 16px;
        --spacing-lg: 24px;
        --spacing-xl: 32px;
      }

      /* ===== HEADER ===== */
      .header-primary {
        --background: var(--gradient-primary);
        box-shadow: var(--shadow-soft);
      }

      .profile-content {
        --background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
        --padding-top: 0;
        --padding-bottom: var(--spacing-lg);
        --padding-start: 0;
        --padding-end: 0;
        position: relative;
        min-height: 100vh;
      }

      .profile-content::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 120px;
        background: var(--gradient-primary);
        z-index: -1;
      }

      /* ===== LOADING & EMPTY STATES ===== */
      .loading-section,
      .no-profile-section {
        padding: var(--spacing-lg);
        margin-top: 60px;
      }

      .loading-content,
      .no-profile-content {
        text-align: center;
        padding: var(--spacing-xl) var(--spacing-lg);
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: var(--border-radius-large);
        box-shadow: var(--shadow-medium);
      }

      .loading-content ion-spinner {
        margin-bottom: var(--spacing-md);
        --color: var(--ion-color-primary);
      }

      .no-profile-content ion-icon {
        font-size: 4rem;
        margin-bottom: var(--spacing-lg);
        color: var(--ion-color-medium);
      }

      .no-profile-content h2 {
        color: var(--ion-color-dark);
        font-weight: 600;
        margin-bottom: var(--spacing-sm);
      }

      .no-profile-content p {
        color: var(--ion-color-medium);
        margin-bottom: var(--spacing-lg);
      }

      /* ===== HERO SECTION ===== */
      .hero-section {
        padding: var(--spacing-lg) var(--spacing-md) 0;
        margin-top: 40px;
      }

      .hero-card {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: var(--shadow-strong);
        border-radius: var(--border-radius-large);
        margin: 0;
        overflow: hidden;
        position: relative;
      }

      .hero-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--gradient-primary);
      }

      .hero-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: var(--spacing-lg);
      }

      .class-display {
        display: flex;
        align-items: center;
        gap: var(--spacing-lg);
      }

      .class-badge {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100px;
        height: 100px;
        border-radius: 50%;
        border: 4px solid;
        position: relative;
        background: white;
        box-shadow: var(--shadow-medium);
        transition: all 0.3s ease;
      }

      .class-badge::after {
        content: '';
        position: absolute;
        inset: -8px;
        border-radius: 50%;
        padding: 4px;
        background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        mask:
          linear-gradient(#fff 0 0) content-box,
          linear-gradient(#fff 0 0);
        mask-composite: exclude;
        animation: shimmer 3s linear infinite;
      }

      @keyframes shimmer {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .class-badge.excellent {
        border-color: #10b981;
        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        color: #065f46;
      }
      .class-badge.good {
        border-color: #3b82f6;
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        color: #1e40af;
      }
      .class-badge.base {
        border-color: #6b7280;
        background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
        color: #374151;
      }
      .class-badge.risk {
        border-color: #f59e0b;
        background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        color: #92400e;
      }
      .class-badge.high-risk {
        border-color: #ef4444;
        background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
        color: #991b1b;
      }

      .class-number {
        font-size: 2.5rem;
        font-weight: 900;
        line-height: 1;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .class-label {
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        opacity: 0.7;
        margin-top: 2px;
      }

      .class-info h1 {
        font-size: 1.75rem;
        font-weight: 800;
        margin: 0 0 var(--spacing-sm) 0;
        background: var(--gradient-primary);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .class-description {
        color: var(--ion-color-medium);
        margin: 0 0 var(--spacing-md) 0;
        font-size: 1rem;
        line-height: 1.4;
      }

      .benefit-highlight {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: 24px;
        font-size: 0.875rem;
        font-weight: 600;
        backdrop-filter: blur(10px);
        box-shadow: var(--shadow-soft);
        transition: all 0.3s ease;
      }

      .benefit-highlight:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-medium);
      }

      .benefit-highlight.discount {
        background: linear-gradient(
          135deg,
          rgba(16, 185, 129, 0.15) 0%,
          rgba(5, 150, 105, 0.15) 100%
        );
        color: #059669;
        border: 1px solid rgba(16, 185, 129, 0.2);
      }

      .benefit-highlight.surcharge {
        background: linear-gradient(
          135deg,
          rgba(239, 68, 68, 0.15) 0%,
          rgba(220, 38, 38, 0.15) 100%
        );
        color: #dc2626;
        border: 1px solid rgba(239, 68, 68, 0.2);
      }

      .benefit-highlight.neutral {
        background: linear-gradient(
          135deg,
          rgba(107, 114, 128, 0.15) 0%,
          rgba(75, 85, 99, 0.15) 100%
        );
        color: #4b5563;
        border: 1px solid rgba(107, 114, 128, 0.2);
      }

      .status-indicator {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-sm);
      }

      .status-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        position: relative;
        box-shadow: var(--shadow-soft);
      }

      .status-dot::before {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        background: inherit;
        opacity: 0.3;
        animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
      }

      @keyframes pulse-ring {
        0% {
          transform: scale(0.8);
          opacity: 0.3;
        }
        50% {
          transform: scale(1.2);
          opacity: 0.1;
        }
        100% {
          transform: scale(1.4);
          opacity: 0;
        }
      }

      .status-dot.active {
        background: #10b981;
      }
      .status-dot.warning {
        background: #f59e0b;
      }
      .status-dot.danger {
        background: #ef4444;
      }

      .status-text {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--ion-color-dark);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      /* ===== PROTECTION SECTION ===== */
      .protection-section {
        padding: var(--spacing-md);
      }

      .protection-card {
        margin: 0;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-soft);
        overflow: hidden;
        transition: all 0.3s ease;
      }

      .protection-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-medium);
      }

      .protection-card.protected {
        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        border: 2px solid #10b981;
      }

      .protection-card.needs-protection {
        background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        border: 2px solid #f59e0b;
      }

      .protection-card.coming-soon {
        background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
        border: 2px solid #9ca3af;
      }

      .protection-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-lg);
      }

      .protection-header ion-icon {
        font-size: 2.5rem;
        flex-shrink: 0;
        background: white;
        border-radius: 50%;
        padding: var(--spacing-sm);
        box-shadow: var(--shadow-soft);
      }

      .protection-info {
        flex: 1;
      }

      .protection-info h3 {
        margin: 0 0 var(--spacing-xs) 0;
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--ion-color-dark);
      }

      .protection-info p {
        margin: 0;
        font-size: 0.95rem;
        color: var(--ion-color-medium);
        line-height: 1.4;
      }

      /* ===== SCORE SECTION ===== */
      .score-section {
        padding: 0 var(--spacing-md) var(--spacing-md);
      }

      .score-section ion-card {
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-medium);
        overflow: hidden;
        background: white;
      }

      .score-display {
        display: flex;
        gap: var(--spacing-xl);
        align-items: center;
        padding: var(--spacing-lg);
      }

      .score-gauge {
        position: relative;
        width: 220px;
        height: 140px;
        flex-shrink: 0;
      }

      .gauge-svg {
        width: 100%;
        height: 100%;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
      }

      .score-arc {
        transition: stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1);
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      }

      .score-number {
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
      }

      .score-value {
        font-size: 3rem;
        font-weight: 900;
        color: var(--ion-color-dark);
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        display: block;
      }

      .score-max {
        font-size: 1.1rem;
        color: var(--ion-color-medium);
        font-weight: 500;
      }

      .score-breakdown {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        min-width: 0;
      }

      .score-category {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
      }

      .score-category span {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--ion-color-dark);
      }

      .category-bar {
        height: 12px;
        background: #f1f5f9;
        border-radius: 6px;
        overflow: hidden;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .bar-fill {
        height: 100%;
        border-radius: 6px;
        transition: width 2s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }

      .bar-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 50%;
        background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.4), transparent);
        border-radius: 6px 6px 0 0;
      }

      .score-message {
        text-align: center;
        margin: var(--spacing-lg) 0 0 0;
        font-style: italic;
        color: var(--ion-color-medium);
        font-size: 1rem;
        background: #f8fafc;
        padding: var(--spacing-md);
        border-radius: var(--spacing-sm);
        border-left: 4px solid var(--ion-color-primary);
      }

      /* ===== BENEFITS SECTION ===== */
      .benefits-section,
      .claims-section,
      .progression-section {
        padding: 0 var(--spacing-md) var(--spacing-md);
      }

      .benefits-section ion-card,
      .claims-section ion-card,
      .progression-section ion-card {
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-medium);
        background: white;
        overflow: hidden;
      }

      .benefits-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-lg);
        padding: var(--spacing-lg);
      }

      .benefit-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: var(--spacing-xl) var(--spacing-lg);
        border-radius: var(--border-radius);
        border: 2px solid transparent;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }

      .benefit-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
      }

      .benefit-item:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-medium);
      }

      .benefit-item.discount {
        background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        border-color: #16a34a;
      }

      .benefit-item.discount::before {
        background: linear-gradient(90deg, #16a34a, #22c55e);
      }

      .benefit-item.surcharge {
        background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
        border-color: #dc2626;
      }

      .benefit-item.surcharge::before {
        background: linear-gradient(90deg, #dc2626, #ef4444);
      }

      .benefit-item.neutral {
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border-color: #64748b;
      }

      .benefit-item.neutral::before {
        background: linear-gradient(90deg, #64748b, #94a3b8);
      }

      .benefit-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: var(--spacing-md);
        background: white;
        box-shadow: var(--shadow-medium);
        transition: transform 0.3s ease;
      }

      .benefit-item:hover .benefit-icon {
        transform: scale(1.1);
      }

      .benefit-icon ion-icon {
        font-size: 1.8rem;
      }

      .benefit-content h4 {
        margin: 0 0 var(--spacing-sm) 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--ion-color-dark);
      }

      .benefit-value {
        margin: 0 0 var(--spacing-xs) 0;
        font-size: 1.4rem;
        font-weight: 800;
        line-height: 1;
      }

      .benefit-description {
        margin: 0;
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        font-weight: 500;
      }

      /* ===== CLAIMS SECTION ===== */
      .claims-overview {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--spacing-lg);
        margin-bottom: var(--spacing-xl);
        padding: var(--spacing-lg);
      }

      .claim-metric {
        text-align: center;
        padding: var(--spacing-lg);
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border-radius: var(--border-radius);
        border: 1px solid #e2e8f0;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .claim-metric::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
      }

      .claim-metric:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-soft);
      }

      .claim-metric:nth-child(1)::before {
        background: #64748b;
      }
      .claim-metric:nth-child(2)::before {
        background: #dc2626;
      }
      .claim-metric:nth-child(3)::before {
        background: #16a34a;
      }

      .metric-number {
        font-size: 2.5rem;
        font-weight: 900;
        margin-bottom: var(--spacing-sm);
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .metric-number.total {
        color: #475569;
      }
      .metric-number.fault {
        color: #dc2626;
      }
      .metric-number.good {
        color: #16a34a;
      }

      .claim-metric p {
        margin: 0;
        font-size: 0.9rem;
        color: var(--ion-color-medium);
        font-weight: 600;
      }

      .claims-timeline {
        border-left: 3px solid #e2e8f0;
        padding-left: var(--spacing-lg);
        margin-left: var(--spacing-md);
        margin-bottom: var(--spacing-lg);
      }

      .timeline-item {
        position: relative;
        padding-bottom: var(--spacing-lg);
      }

      .timeline-dot {
        position: absolute;
        left: -30px;
        top: 6px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--ion-color-primary);
        border: 3px solid white;
        box-shadow: var(--shadow-soft);
        z-index: 1;
      }

      .timeline-content {
        background: #f8fafc;
        padding: var(--spacing-md);
        border-radius: var(--spacing-sm);
        border-left: 4px solid var(--ion-color-primary);
      }

      .timeline-content h4 {
        margin: 0 0 var(--spacing-xs) 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--ion-color-dark);
      }

      .timeline-content p {
        margin: 0 0 var(--spacing-sm) 0;
        font-size: 0.95rem;
        color: var(--ion-color-medium);
      }

      .no-claims {
        text-align: center;
        padding: var(--spacing-xl);
        background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        border-radius: var(--border-radius);
        margin: var(--spacing-lg);
      }

      .no-claims ion-icon {
        font-size: 3.5rem;
        margin-bottom: var(--spacing-md);
        color: #16a34a;
      }

      .no-claims p {
        font-size: 1.1rem;
        font-weight: 600;
        color: #166534;
        margin: 0;
      }

      /* ===== CLASS LADDER ===== */
      .class-ladder {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        padding: var(--spacing-lg);
      }

      .ladder-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-md);
        border-radius: var(--spacing-sm);
        transition: all 0.3s ease;
        border: 2px solid transparent;
        position: relative;
        overflow: hidden;
      }

      .ladder-item::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        transition: width 0.3s ease;
      }

      .ladder-item:hover {
        transform: translateX(4px);
      }

      .ladder-item.current {
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        border-color: #3b82f6;
        box-shadow: var(--shadow-soft);
      }

      .ladder-item.current::before {
        background: #3b82f6;
        width: 8px;
      }

      .ladder-item.better {
        background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        opacity: 0.9;
      }

      .ladder-item.better::before {
        background: #16a34a;
      }

      .ladder-item.worse {
        background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
        opacity: 0.5;
      }

      .ladder-item.worse::before {
        background: #dc2626;
      }

      .ladder-class {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        background: white;
        box-shadow: var(--shadow-soft);
        color: var(--ion-color-dark);
        font-size: 1.2rem;
        flex-shrink: 0;
      }

      .ladder-info {
        flex: 1;
        min-width: 0;
      }

      .ladder-info h4 {
        margin: 0 0 var(--spacing-xs) 0;
        font-size: 1rem;
        font-weight: 700;
        color: var(--ion-color-dark);
      }

      .ladder-info p {
        margin: 0;
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        line-height: 1.3;
      }

      .ladder-status {
        flex-shrink: 0;
      }

      .ladder-status ion-icon {
        font-size: 1.5rem;
      }

      .progression-message {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-lg);
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        border-radius: var(--border-radius);
        margin: var(--spacing-lg);
        border: 1px solid #bfdbfe;
      }

      .progression-message ion-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      .progression-message p {
        margin: 0;
        font-size: 0.95rem;
        color: var(--ion-color-dark);
        line-height: 1.4;
      }

      /* ===== ACTIONS SECTION ===== */
      .actions-section {
        padding: var(--spacing-md);
      }

      .actions-section ion-button {
        --border-radius: var(--border-radius);
        --box-shadow: var(--shadow-soft);
        font-weight: 600;
        height: 48px;
      }

      .actions-section ion-button:hover {
        --box-shadow: var(--shadow-medium);
        transform: translateY(-2px);
      }

      /* ===== RESPONSIVE DESIGN ===== */
      @media (max-width: 768px) {
        .hero-content {
          flex-direction: column;
          gap: var(--spacing-lg);
          text-align: center;
        }

        .class-display {
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .class-badge {
          width: 120px;
          height: 120px;
        }

        .class-number {
          font-size: 3rem;
        }

        .score-display {
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .score-gauge {
          width: 200px;
          height: 120px;
        }

        .benefits-grid {
          grid-template-columns: 1fr;
        }

        .claims-overview {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 480px) {
        .class-badge {
          width: 100px;
          height: 100px;
        }

        .class-number {
          font-size: 2.5rem;
        }

        .benefit-item {
          padding: var(--spacing-lg);
        }

        .claim-metric {
          padding: var(--spacing-md);
        }

        .metric-number {
          font-size: 2rem;
        }
      }

      /* ===== ACCESSIBILITY ===== */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* ===== DARK MODE SUPPORT ===== */
      @media (prefers-color-scheme: dark) {
        .profile-content {
          --background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
        }

        .hero-card {
          background: rgba(30, 41, 59, 0.95);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .benefit-item,
        .claim-metric,
        .protection-card {
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .timeline-content,
        .progression-message {
          background: rgba(30, 41, 59, 0.6);
        }
      }
    `,
  ],
})
export class DriverProfilePage implements OnInit {
  protected readonly driverService = inject(DriverProfileService);
  protected readonly bonusProtectorService = inject(BonusProtectorService);
  private readonly modalController = inject(ModalController);
  private readonly alertController = inject(AlertController);
  private readonly metaService = inject(MetaService);

  // Computed signals from services
  readonly profile = computed(() => this.driverService.profile());
  readonly driverClass = computed(() => this.driverService.driverClass());
  readonly driverScore = computed(() => this.driverService.driverScore());
  readonly hasDiscount = computed(() => this.driverService.hasDiscount());
  readonly hasSurcharge = computed(() => this.driverService.hasSurcharge());
  readonly feeDiscountPct = computed(() => this.driverService.feeDiscountPct());
  readonly guaranteeDiscountPct = computed(() => this.driverService.guaranteeDiscountPct());
  readonly classDescription = computed(() => this.driverService.getClassDescription());
  readonly hasActiveProtector = computed(() => this.bonusProtectorService.hasActiveProtector());

  ngOnInit(): void {
    this.updateMeta();
    this.loadData();
  }

  private async loadData(): Promise<void> {
    try {
      await this.driverService.ensureProfile();

      // Intentar cargar protector activo, pero no fallar si no existe
      try {
        await this.bonusProtectorService.loadActiveProtector();
        await this.bonusProtectorService.loadOptions();
      } catch (protectorError) {
        console.warn('[DriverProfilePage] Bonus protector service not available:', protectorError);
        // Continuar sin el servicio de protector
      }
    } catch (error) {
      console.error('[DriverProfilePage] Error loading data:', error);
    }
  }

  async initializeProfile(): Promise<void> {
    try {
      await this.driverService.initializeProfile();
    } catch (error) {
      console.error('[DriverProfilePage] Error initializing profile:', error);
    }
  }

  async showSystemExplanation(): Promise<void> {
    const modal = await this.modalController.create({
      component: ClassBenefitsModalComponent,
      componentProps: {
        currentClass: this.driverClass(),
      },
    });
    await modal.present();
  }

  buyProtection(): void {
    // Navigate to protections page
    window.location.href = '/protections';
  }

  // Visual helpers
  getClassStyle(): string {
    const cls = this.driverClass();
    if (cls <= 2) return 'excellent';
    if (cls <= 4) return 'good';
    if (cls === 5) return 'base';
    if (cls <= 7) return 'risk';
    return 'high-risk';
  }

  getClassTitle(): string {
    const cls = this.driverClass();
    if (cls <= 2) return 'Conductor Excelente';
    if (cls <= 4) return 'Buen Conductor';
    if (cls === 5) return 'Conductor Base';
    if (cls <= 7) return 'Conductor de Riesgo';
    return 'Alto Riesgo';
  }

  getBenefitStyle(): string {
    if (this.hasDiscount()) return 'discount';
    if (this.hasSurcharge()) return 'surcharge';
    return 'neutral';
  }

  getBenefitIcon(): string {
    if (this.hasDiscount()) return 'trending-down';
    if (this.hasSurcharge()) return 'trending-up';
    return 'remove';
  }

  getBenefitText(): string {
    const fee = this.feeDiscountPct();
    if (fee > 0) return `${fee}% de descuento`;
    if (fee < 0) return `${Math.abs(fee)}% de recargo`;
    return 'Sin ajustes';
  }

  getStatusColor(): string {
    if (this.hasActiveProtector()) return 'active';
    if (this.driverClass() > 5) return 'danger';
    if (this.driverClass() > 3) return 'warning';
    return 'active';
  }

  getStatusText(): string {
    if (this.hasActiveProtector()) return 'Protegido';
    if (this.driverClass() > 5) return 'Riesgo Alto';
    if (this.driverClass() > 3) return 'Atención';
    return 'Excelente';
  }

  getProtectionCardStyle(): string {
    if (this.bonusProtectorService.error()) {
      return 'coming-soon';
    }
    return this.hasActiveProtector() ? 'protected' : 'needs-protection';
  }

  getProtectionIcon(): string {
    return this.hasActiveProtector() ? 'shield-checkmark' : 'shield-outline';
  }

  getProtectionIconColor(): string {
    return this.hasActiveProtector() ? 'success' : 'warning';
  }

  getProtectionTitle(): string {
    if (this.bonusProtectorService.error()) {
      return 'Protección de Clase';
    }
    return this.hasActiveProtector() ? 'Protección Activa' : 'Sin Protección';
  }

  getProtectionMessage(): string {
    if (this.bonusProtectorService.error()) {
      return 'El sistema de protección estará disponible próximamente';
    }
    if (this.hasActiveProtector()) {
      return 'Tu clase está protegida contra siniestros';
    }
    return 'Protege tu clase de conductor de siniestros inesperados';
  }

  needsProtection(): boolean {
    // Solo mostrar la opción si el servicio de protector está disponible
    if (this.bonusProtectorService.error()) {
      return false;
    }
    return !this.hasActiveProtector() && this.driverClass() <= 7;
  }

  // Score helpers
  getScoreColor(): string {
    const score = this.driverScore();
    if (score >= 80) return '#2dd36f';
    if (score >= 60) return '#3880ff';
    if (score >= 40) return '#ffc409';
    return '#eb445a';
  }

  getScoreArcLength(): string {
    const circumference = Math.PI * 80; // radius = 80
    return `${circumference} ${circumference}`;
  }

  getScoreArcOffset(): string {
    const circumference = Math.PI * 80;
    const score = this.driverScore();
    const offset = circumference - (score / 100) * circumference;
    return offset.toString();
  }

  getScoreMessage(): string {
    return this.driverService.getScoreMessage();
  }

  // Mock score breakdown (would come from service in real app)
  getSpeedScore(): number {
    return Math.min(100, this.driverScore() + Math.random() * 20 - 10);
  }

  getBrakingScore(): number {
    return Math.min(100, this.driverScore() + Math.random() * 20 - 10);
  }

  getAccelerationScore(): number {
    return Math.min(100, this.driverScore() + Math.random() * 20 - 10);
  }

  // Benefit helpers
  getFeeStyle(): string {
    return this.getBenefitStyle();
  }

  getFeeIcon(): string {
    return this.getBenefitIcon();
  }

  getFeeText(): string {
    return this.getBenefitText();
  }

  getFeeDescription(): string {
    if (this.hasDiscount()) return 'Pagas menos comisión';
    if (this.hasSurcharge()) return 'Comisión adicional';
    return 'Tarifa estándar';
  }

  getGuaranteeStyle(): string {
    return this.getBenefitStyle();
  }

  getGuaranteeIcon(): string {
    if (this.hasDiscount()) return 'shield-checkmark';
    if (this.hasSurcharge()) return 'shield';
    return 'shield-outline';
  }

  getGuaranteeText(): string {
    const guarantee = this.guaranteeDiscountPct();
    if (guarantee > 0) return `${guarantee}% menos garantía`;
    if (guarantee < 0) return `${Math.abs(guarantee)}% más garantía`;
    return 'Garantía estándar';
  }

  getGuaranteeDescription(): string {
    if (this.hasDiscount()) return 'Menor depósito requerido';
    if (this.hasSurcharge()) return 'Mayor depósito requerido';
    return 'Depósito estándar';
  }

  // Class ladder
  getClassLadder(): Array<{ class: number; title: string; benefit: string }> {
    return [
      { class: 0, title: 'Excelente', benefit: '15% descuento, 25% menos garantía' },
      { class: 1, title: 'Muy Bueno', benefit: '12% descuento, 20% menos garantía' },
      { class: 2, title: 'Bueno', benefit: '8% descuento, 15% menos garantía' },
      { class: 3, title: 'Regular+', benefit: '4% descuento, 5% menos garantía' },
      { class: 4, title: 'Regular', benefit: '2% descuento' },
      { class: 5, title: 'Base', benefit: 'Sin ajustes' },
      { class: 6, title: 'Riesgo Bajo', benefit: '5% recargo, 10% más garantía' },
      { class: 7, title: 'Riesgo Medio', benefit: '10% recargo, 20% más garantía' },
      { class: 8, title: 'Riesgo Alto', benefit: '15% recargo, 40% más garantía' },
      { class: 9, title: 'Riesgo Muy Alto', benefit: '18% recargo, 60% más garantía' },
      { class: 10, title: 'Riesgo Máximo', benefit: '20% recargo, 80% más garantía' },
    ];
  }

  canImprove(): boolean {
    return this.driverClass() > 0;
  }

  yearsToImprove(): number {
    return 1; // Standard: 1 year without fault claims
  }

  getNextBetterClass(): number {
    return Math.max(0, this.driverClass() - 1);
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private updateMeta(): void {
    this.metaService.updateMeta({
      title: 'Mi Perfil de Conductor - AutoRenta',
      description:
        'Revisa tu clase de conductor, beneficios y descuentos en el sistema Bonus-Malus.',
      keywords: 'perfil conductor, bonus malus, descuentos, clase conductor, seguro',
    });
  }
}
