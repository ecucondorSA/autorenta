import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-community',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Comunidad</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="static-page">
        <section class="static-hero" style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);">
          <h1>🤝 Comunidad Autorentar</h1>
          <p>Conecta con otros usuarios, comparte experiencias y aprende</p>
        </section>

        <div class="static-content">
          <h2>Únete a Nuestra Comunidad</h2>
          <p>
            La comunidad Autorentar es un espacio donde arrendatarios y propietarios
            pueden conectarse, compartir consejos y aprender unos de otros.
          </p>

          <div class="card-grid">
            <div class="info-card">
              <h3>💬 Foro de Discusión</h3>
              <p>Participa en conversaciones sobre alquileres, consejos de viaje y más. (Próximamente)</p>
            </div>
            <div class="info-card">
              <h3>📸 Comparte tu Experiencia</h3>
              <p>Publica fotos de tus viajes y los autos que has alquilado.</p>
            </div>
            <div class="info-card">
              <h3>🏆 Programa de Embajadores</h3>
              <p>Conviértete en embajador y obtén beneficios exclusivos.</p>
            </div>
          </div>

          <h2>Eventos y Meetups</h2>
          <p>
            Organizamos eventos periódicos donde la comunidad puede reunirse,
            conocerse y disfrutar de experiencias automotrices únicas.
          </p>

          <div class="cta-section">
            <h3>¿Quieres ser parte activa?</h3>
            <p>Únete a nuestras redes sociales para enterarte de todo</p>
            <a href="https://instagram.com/autorenta" target="_blank" rel="noopener" class="cta-button">
              Seguir en Instagram
            </a>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styleUrls: ['./static-shared.css'],
})
export class CommunityPage { }
