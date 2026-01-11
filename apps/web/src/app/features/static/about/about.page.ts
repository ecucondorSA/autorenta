import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-about',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Sobre Nosotros</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="static-page">
        <section class="static-hero">
          <h1>🚗 Sobre Autorentar</h1>
          <p>La plataforma de alquiler de autos entre personas de Argentina</p>
        </section>

        <div class="static-content">
          <h2>Nuestra Misión</h2>
          <p>
            En Autorentar creemos que el acceso a la movilidad debería ser simple,
            seguro y accesible para todos. Conectamos a personas que necesitan un
            auto con propietarios que quieren generar ingresos extra.
          </p>

          <h2>Nuestra Historia</h2>
          <p>
            Fundada en 2026 en Buenos Aires, Autorentar nació de la visión de crear
            una comunidad donde compartir vehículos sea tan natural como compartir
            cualquier otro recurso. Hoy, operamos en toda Argentina.
          </p>

          <h2>Nuestros Valores</h2>
          <div class="card-grid">
            <div class="info-card">
              <h3>🤝 Confianza</h3>
              <p>Verificamos cada usuario y protegemos cada transacción.</p>
            </div>
            <div class="info-card">
              <h3>🌱 Sustentabilidad</h3>
              <p>Cada auto compartido es un auto menos en la calle.</p>
            </div>
            <div class="info-card">
              <h3>💡 Innovación</h3>
              <p>Usamos tecnología de punta para mejorar la experiencia.</p>
            </div>
            <div class="info-card">
              <h3>❤️ Comunidad</h3>
              <p>Somos más que una app, somos una comunidad.</p>
            </div>
          </div>

          <h2>El Equipo</h2>
          <p>
            Somos un equipo apasionado de emprendedores, desarrolladores y diseñadores
            enfocados en revolucionar la movilidad en Argentina.
          </p>

          <div class="cta-section">
            <h3>¿Quieres ser parte del equipo?</h3>
            <a routerLink="/careers" class="cta-button">Ver Oportunidades</a>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styleUrls: ['./static-shared.css'],
})
export class AboutPage { }
