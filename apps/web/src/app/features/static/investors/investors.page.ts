import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-investors',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Inversionistas</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="static-page">
        <section class="static-hero" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
          <h1>📊 Información para Inversionistas</h1>
          <p>Participa en el crecimiento de Autorentar</p>
        </section>

        <div class="static-content">
          <h2>Oportunidad de Mercado</h2>
          <p>
            El mercado de alquiler de autos entre particulares en Latinoamérica
            está valorado en miles de millones de dólares y crece año tras año.
            Autorentar está posicionada para capturar una porción significativa
            de este mercado en Argentina.
          </p>

          <h2>Métricas Clave</h2>
          <div class="card-grid">
            <div class="info-card">
              <h3>🚗 Vehículos Activos</h3>
              <p>Crecimiento mensual sostenido</p>
            </div>
            <div class="info-card">
              <h3>📈 GMV</h3>
              <p>Volumen bruto de transacciones en aumento</p>
            </div>
            <div class="info-card">
              <h3>⭐ Rating Promedio</h3>
              <p>4.8/5 satisfacción de usuarios</p>
            </div>
            <div class="info-card">
              <h3>🔄 Retención</h3>
              <p>Alta tasa de usuarios recurrentes</p>
            </div>
          </div>

          <h2>¿Por qué Autorentar?</h2>
          <ul>
            <li>Primer mover en Argentina con tecnología de punta</li>
            <li>Modelo de negocio probado (take rate por transacción)</li>
            <li>Equipo fundador con experiencia en tech y fintech</li>
            <li>Protección innovadora con AirCover (FGO)</li>
          </ul>

          <div class="cta-section">
            <h3>¿Interesado en invertir?</h3>
            <p>Contacta a nuestro equipo de relaciones con inversionistas</p>
            <p style="margin-top: 1rem;"><strong>investors&#64;autorentar.com.ar</strong></p>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styleUrls: ['./static-shared.css'],
})
export class InvestorsPage { }
