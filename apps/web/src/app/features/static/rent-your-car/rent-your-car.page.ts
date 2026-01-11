import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-rent-your-car',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Alquila tu Auto</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="static-page">
        <section class="static-hero" style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);">
          <h1>🚗 Gana Dinero con tu Auto</h1>
          <p>Publica tu vehículo y genera ingresos cuando no lo usas</p>
        </section>

        <div class="static-content">
          <h2>¿Por qué alquilar tu auto?</h2>
          <div class="card-grid">
            <div class="info-card">
              <h3>💰 Ingresos Extra</h3>
              <p>Gana dinero con un activo que normalmente está estacionado.</p>
            </div>
            <div class="info-card">
              <h3>🛡️ Protección Incluida</h3>
              <p>Tu auto está protegido por AirCover durante cada alquiler.</p>
            </div>
            <div class="info-card">
              <h3>📅 Tú Controlas</h3>
              <p>Elige cuándo está disponible, el precio y quién puede alquilar.</p>
            </div>
            <div class="info-card">
              <h3>✅ Proceso Simple</h3>
              <p>Publicar tu auto toma solo unos minutos.</p>
            </div>
          </div>

          <h2>¿Cuánto puedo ganar?</h2>
          <p>
            Los propietarios en Buenos Aires ganan en promedio entre $50.000 y $150.000 ARS
            por mes, dependiendo del tipo de vehículo y la frecuencia de alquileres.
          </p>

          <h2>Cómo empezar</h2>
          <ul>
            <li>Crea tu cuenta y verifica tu identidad</li>
            <li>Agrega fotos y datos de tu vehículo</li>
            <li>Establece tu precio y disponibilidad</li>
            <li>Recibe solicitudes y aprueba reservas</li>
            <li>Entrega el auto y recibe tu pago</li>
          </ul>

          <div class="cta-section">
            <h3>¿Listo para empezar a ganar?</h3>
            <a routerLink="/cars/publish" class="cta-button">Publicar mi Auto</a>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styleUrls: ['../static-shared.css'],
})
export class RentYourCarPage { }
