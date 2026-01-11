import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-cancellation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Política de Cancelación</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="static-page">
        <section class="static-hero" style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);">
          <h1>📅 Opciones de Cancelación</h1>
          <p>Flexibilidad para cambiar tus planes cuando lo necesites</p>
        </section>

        <div class="static-content">
          <h2>Políticas de Cancelación</h2>
          <p>
            Cada propietario puede establecer su propia política de cancelación.
            Antes de reservar, revisa la política específica del vehículo.
          </p>

          <h2>Tipos de Políticas</h2>
          <div class="card-grid">
            <div class="info-card">
              <h3>🟢 Flexible</h3>
              <p>Cancelación gratuita hasta 24 horas antes del inicio. Reembolso del 50% si cancelas después.</p>
            </div>
            <div class="info-card">
              <h3>🟡 Moderada</h3>
              <p>Cancelación gratuita hasta 5 días antes. Reembolso del 50% hasta 24 horas antes.</p>
            </div>
            <div class="info-card">
              <h3>🔴 Estricta</h3>
              <p>Cancelación gratuita hasta 7 días antes. Sin reembolso después de ese plazo.</p>
            </div>
          </div>

          <h2>Cómo Cancelar</h2>
          <ul>
            <li>Ve a "Mis Reservas" en tu perfil</li>
            <li>Selecciona la reserva que deseas cancelar</li>
            <li>Haz clic en "Cancelar Reserva"</li>
            <li>Confirma la cancelación y revisa el reembolso aplicable</li>
          </ul>

          <h2>Cancelaciones por el Propietario</h2>
          <p>
            Si el propietario cancela tu reserva, recibirás un reembolso completo
            y te ayudaremos a encontrar un vehículo alternativo similar.
          </p>

          <div class="cta-section">
            <h3>¿Necesitas ayuda con una cancelación?</h3>
            <a routerLink="/support" class="cta-button">Contactar Soporte</a>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styleUrls: ['../static-shared.css'],
})
export class CancellationPage { }
