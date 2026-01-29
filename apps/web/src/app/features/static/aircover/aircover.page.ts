import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-aircover',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/"></ion-back-button>
        </ion-buttons>
        <ion-title>AirCover</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="static-page">
        <section class="static-hero" style="background: linear-gradient(135deg, #065f46 0%, #047857 100%);">
          <h1>🛡️ AirCover</h1>
          <p>Protección integral para cada viaje. Alquila con tranquilidad.</p>
        </section>

        <div class="static-content">
          <h2>¿Qué es AirCover?</h2>
          <p>
            AirCover es nuestro Fondo de Garantía Operativo (FGO), un sistema de protección
            mutua diseñado para proteger tanto a arrendatarios como a propietarios durante
            cada alquiler.
          </p>

          <h2>Protección para Arrendatarios</h2>
          <div class="card-grid">
            <div class="info-card">
              <h3>🚗 Asistencia en Ruta 24/7</h3>
              <p>Si tienes un problema mecánico, te ayudamos a resolverlo sin importar la hora.</p>
            </div>
            <div class="info-card">
              <h3>🔄 Auto de Reemplazo</h3>
              <p>Si el auto tiene problemas, te conseguimos otro para que sigas tu viaje.</p>
            </div>
            <div class="info-card">
              <h3>💰 Reembolso Garantizado</h3>
              <p>Si la reserva se cancela por el propietario, recuperas tu dinero completamente.</p>
            </div>
          </div>

          <h2>Protección para Propietarios</h2>
          <div class="card-grid">
            <div class="info-card">
              <h3>🛡️ Cobertura de Daños</h3>
              <p>El FGO cubre daños al vehículo hasta el monto del depósito de garantía.</p>
            </div>
            <div class="info-card">
              <h3>📋 Verificación de Conductores</h3>
              <p>Verificamos licencia, identidad y antecedentes de cada conductor.</p>
            </div>
            <div class="info-card">
              <h3>💳 Pagos Garantizados</h3>
              <p>Procesamos los pagos de forma segura y te transferimos a tu cuenta.</p>
            </div>
          </div>

          <h2>¿Cómo Funciona?</h2>
          <ul>
            <li>El arrendatario paga un depósito de garantía reembolsable</li>
            <li>Se realiza inspección con video al inicio y fin del alquiler</li>
            <li>Si no hay daños, el depósito se libera automáticamente</li>
            <li>Si hay daños, el FGO procesa el reclamo de forma justa</li>
          </ul>

          <div class="cta-section">
            <h3>¿Tienes preguntas sobre AirCover?</h3>
            <a routerLink="/support" class="cta-button">Contactar Soporte</a>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styleUrls: ['./static-shared.css'],
})
export class AircoverPage { }
