import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-newsroom',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Novedades</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="static-page">
        <section class="static-hero" style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);">
          <h1>📰 Novedades</h1>
          <p>Las últimas noticias y actualizaciones de Autorentar</p>
        </section>

        <div class="static-content">
          <h2>Últimas Noticias</h2>

          <div class="card-grid">
            <div class="info-card">
              <h3>🚀 Lanzamiento 2026</h3>
              <p>Autorentar está oficialmente disponible en toda Argentina.</p>
              <small style="color: #94a3b8;">Enero 2026</small>
            </div>
            <div class="info-card">
              <h3>🛡️ AirCover Mejorado</h3>
              <p>Nueva protección con cobertura extendida para propietarios.</p>
              <small style="color: #94a3b8;">Enero 2026</small>
            </div>
            <div class="info-card">
              <h3>📱 App Nativa</h3>
              <p>Próximamente disponible en App Store y Google Play.</p>
              <small style="color: #94a3b8;">Próximamente</small>
            </div>
          </div>

          <h2>Comunicados de Prensa</h2>
          <p>
            Para consultas de prensa, contacta a nuestro equipo de comunicaciones
            en <strong>prensa&#64;autorentar.com.ar</strong>
          </p>

          <h2>Recursos de Prensa</h2>
          <ul>
            <li>Kit de prensa y logos (próximamente)</li>
            <li>Fotos oficiales de la plataforma</li>
            <li>Información de fundadores</li>
          </ul>

          <div class="cta-section">
            <h3>Síguenos para más novedades</h3>
            <a href="https://twitter.com/autorenta" target="_blank" rel="noopener" class="cta-button">
              Seguir en Twitter
            </a>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styleUrls: ['../static-shared.css'],
})
export class NewsroomPage { }
