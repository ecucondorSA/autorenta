import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-resources',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Centro de Recursos</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="static-page">
        <section class="static-hero">
          <h1>📖 Centro de Recursos</h1>
          <p>Todo lo que necesitas saber sobre Autorentar</p>
        </section>

        <div class="static-content">
          <h2>Recursos Populares</h2>
          <div class="card-grid">
            <a routerLink="/help" class="info-card">
              <h3>❓ Centro de Ayuda</h3>
              <p>Preguntas frecuentes y guías</p>
            </a>
            <a routerLink="/aircover" class="info-card">
              <h3>🛡️ Protección AirCover</h3>
              <p>Cómo te protegemos</p>
            </a>
            <a routerLink="/safety" class="info-card">
              <h3>🔒 Seguridad</h3>
              <p>Nuestras medidas de seguridad</p>
            </a>
            <a routerLink="/terms" class="info-card">
              <h3>📜 Términos y Condiciones</h3>
              <p>Reglas de uso de la plataforma</p>
            </a>
          </div>

          <h2>Para Arrendatarios</h2>
          <ul>
            <li>Cómo buscar y reservar un auto</li>
            <li>Qué documentos necesitas</li>
            <li>Proceso de check-in y check-out</li>
            <li>Qué hacer en caso de accidente</li>
          </ul>

          <h2>Para Propietarios</h2>
          <ul>
            <li>Cómo publicar tu auto</li>
            <li>Gestión de reservas y calendario</li>
            <li>Configurar precios dinámicos</li>
            <li>Proceso de cobro y retiros</li>
          </ul>

          <div class="cta-section">
            <h3>¿No encontraste lo que buscabas?</h3>
            <a routerLink="/support" class="cta-button">Contactar Soporte</a>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styleUrls: ['../static-shared.css'],
})
export class ResourcesPage { }
