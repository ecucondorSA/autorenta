import { Component, OnInit, inject, signal, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonText,
  IonNote,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircle,
  helpCircle,
  chatbubbles,
  mail,
  arrowBack,
} from 'ionicons/icons';

import { FaceVerificationService } from '@core/services/verification/face-verification.service';

/**
 * Page shown when user is blocked from KYC verification
 * (e.g., after 5 failed face verification attempts)
 */
@Component({
  selector: 'app-verification-blocked',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonText,
    IonNote,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="danger">
        <ion-title>Verificación Bloqueada</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="blocked-container">
        <div class="blocked-icon">
          <ion-icon name="alert-circle" color="danger"></ion-icon>
        </div>

        <ion-text color="dark">
          <h1>Cuenta Temporalmente Bloqueada</h1>
        </ion-text>

        <ion-card>
          <ion-card-content>
            <p class="block-reason">
              @if (blockReason()) {
                {{ blockReason() }}
              } @else {
                Tu cuenta ha sido bloqueada temporalmente debido a múltiples
                intentos fallidos de verificación facial.
              }
            </p>

            @if (attempts()) {
              <ion-note color="medium">
                Intentos fallidos: {{ attempts() }}/5
              </ion-note>
            }
          </ion-card-content>
        </ion-card>

        <div class="help-section">
          <ion-text color="dark">
            <h2>¿Qué puedo hacer?</h2>
          </ion-text>

          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="helpCircle"></ion-icon>
                Contactar a Soporte
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>
                Nuestro equipo de soporte puede ayudarte a desbloquear tu cuenta
                después de verificar tu identidad manualmente.
              </p>

              <div class="contact-buttons">
                <ion-button expand="block" (click)="openWhatsApp()">
                  <ion-icon name="chatbubbles" slot="start"></ion-icon>
                  WhatsApp Soporte
                </ion-button>

                <ion-button expand="block" fill="outline" (click)="openEmail()">
                  <ion-icon name="mail" slot="start"></ion-icon>
                  Enviar Email
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="help-circle"></ion-icon>
                ¿Por qué fui bloqueado?
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ul class="reasons-list">
                <li>La foto de tu documento no coincide con tu selfie</li>
                <li>La iluminación o calidad del video fue insuficiente</li>
                <li>El documento puede estar vencido o dañado</li>
                <li>Posible intento de suplantación de identidad</li>
              </ul>
            </ion-card-content>
          </ion-card>
        </div>

        <ion-button
          expand="block"
          fill="clear"
          routerLink="/home"
          class="back-btn"
        >
          <ion-icon name="arrow-back" slot="start"></ion-icon>
          Volver al Inicio
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .blocked-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 24px 16px;
    }

    .blocked-icon {
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ion-color-danger-tint);
      border-radius: 50%;
      margin-bottom: 24px;

      ion-icon {
        font-size: 60px;
      }
    }

    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .block-reason {
      font-size: 1rem;
      line-height: 1.5;
      margin-bottom: 12px;
    }

    ion-note {
      display: block;
      margin-top: 8px;
    }

    .help-section {
      width: 100%;
      margin-top: 32px;
      text-align: left;

      h2 {
        font-size: 1.2rem;
        margin-bottom: 16px;
        text-align: center;
      }
    }

    .contact-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
    }

    .reasons-list {
      margin: 0;
      padding-left: 20px;

      li {
        margin-bottom: 8px;
        line-height: 1.4;
      }
    }

    ion-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;

      ion-icon {
        font-size: 1.2rem;
      }
    }

    .back-btn {
      margin-top: 32px;
    }
  `],
})
export class VerificationBlockedPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly faceVerificationService = inject(FaceVerificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly blockReason = signal<string | null>(null);
  readonly attempts = signal<number | null>(null);

  constructor() {
    addIcons({
      alertCircle,
      helpCircle,
      chatbubbles,
      mail,
      arrowBack,
    });
  }

  async ngOnInit(): Promise<void> {
    // Get params from route
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        if (params['reason']) {
          this.blockReason.set(params['reason']);
        }
        if (params['attempts']) {
          this.attempts.set(parseInt(params['attempts'], 10));
        }
      });

    // Also check current block status
    try {
      const status = await this.faceVerificationService.isUserKycBlocked();
      if (!status.blocked) {
        // Not actually blocked, redirect back
        this.router.navigate(['/verification']);
        return;
      }

      if (status.reason && !this.blockReason()) {
        this.blockReason.set(status.reason);
      }
      if (status.attempts && !this.attempts()) {
        this.attempts.set(status.attempts);
      }
    } catch (err) {
      console.error('Error checking block status:', err);
    }
  }

  openWhatsApp(): void {
    const message = encodeURIComponent(
      `Hola, necesito ayuda para desbloquear mi verificación facial en AutoRenta. Mi cuenta fue bloqueada después de múltiples intentos fallidos.`
    );
    window.open(`https://wa.me/5491123456789?text=${message}`, '_blank');
  }

  openEmail(): void {
    const subject = encodeURIComponent('Desbloqueo de Verificación Facial');
    const body = encodeURIComponent(
      `Hola equipo de soporte,\n\nMi cuenta ha sido bloqueada para verificación facial después de múltiples intentos fallidos.\n\nSolicito ayuda para desbloquear mi cuenta.\n\nGracias.`
    );
    window.open(`mailto:soporte@autorenta.com?subject=${subject}&body=${body}`);
  }
}
