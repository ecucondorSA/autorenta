import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-help-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Centro de Ayuda</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="static-page">
        <section class="static-hero">
          <h1>Centro de Ayuda</h1>
          <p>Encuentra respuestas a tus preguntas y obtén la ayuda que necesitas</p>
        </section>

        <div class="static-content">
          <h2>Preguntas Frecuentes</h2>

          <div class="card-grid">
            <div class="info-card">
              <h3>¿Cómo reservo un auto?</h3>
              <p>Busca el auto que te gusta, selecciona las fechas y confirma tu reserva con el pago.</p>
            </div>
            <div class="info-card">
              <h3>¿Qué documentos necesito?</h3>
              <p>Licencia de conducir vigente, DNI o pasaporte, y una tarjeta de crédito a tu nombre.</p>
            </div>
            <div class="info-card">
              <h3>¿Cómo cancelo una reserva?</h3>
              <p>Puedes cancelar desde "Mis Reservas". Las políticas de reembolso varían según el propietario.</p>
            </div>
            <div class="info-card">
              <h3>¿Qué pasa si tengo un problema?</h3>
              <p>Nuestro equipo de soporte está disponible 24/7 para ayudarte con cualquier situación.</p>
            </div>
          </div>

          <h2>Categorías de Ayuda</h2>

          <div class="card-grid">
            <a routerLink="/aircover" class="info-card">
              <h3>🛡️ Protección AirCover</h3>
              <p>Conoce cómo estás protegido durante tu alquiler</p>
            </a>
            <a routerLink="/cancellation" class="info-card">
              <h3>📅 Cancelaciones</h3>
              <p>Políticas y opciones de cancelación</p>
            </a>
            <a routerLink="/safety" class="info-card">
              <h3>🔒 Seguridad</h3>
              <p>Cómo mantenemos tu seguridad</p>
            </a>
            <div class="info-card">
              <h3>💳 Pagos</h3>
              <p>Información sobre métodos de pago y facturación</p>
            </div>
          </div>

          <div class="cta-section">
            <h3>¿No encontraste lo que buscabas?</h3>
            <p>Nuestro equipo de soporte está listo para ayudarte</p>
            <a routerLink="/support" class="cta-button">Contactar Soporte</a>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styleUrls: ['./static-shared.css'],
})
export class HelpCenterPage { }
