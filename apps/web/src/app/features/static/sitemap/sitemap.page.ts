import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-sitemap',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Mapa del Sitio</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="static-page">
        <section class="static-hero">
          <h1>🗺️ Mapa del Sitio</h1>
          <p>Todas las páginas de Autorentar en un solo lugar</p>
        </section>

        <div class="static-content">
          <h2>Principal</h2>
          <ul>
            <li><a routerLink="/">Inicio</a></li>
            <li><a routerLink="/cars/list">Explorar Autos</a></li>
            <li><a routerLink="/cars/publish">Publicar un Auto</a></li>
          </ul>

          <h2>Soporte</h2>
          <ul>
            <li><a routerLink="/help">Centro de Ayuda</a></li>
            <li><a routerLink="/aircover">AirCover</a></li>
            <li><a routerLink="/safety">Seguridad</a></li>
            <li><a routerLink="/cancellation">Política de Cancelación</a></li>
            <li><a routerLink="/support">Atención al Cliente</a></li>
          </ul>

          <h2>Comunidad</h2>
          <ul>
            <li><a routerLink="/community">Foro de la Comunidad</a></li>
            <li><a routerLink="/rent-your-car">Alquila tu Auto</a></li>
            <li><a routerLink="/owner-resources">Recursos para Propietarios</a></li>
            <li><a routerLink="/resources">Centro de Recursos</a></li>
          </ul>

          <h2>Empresa</h2>
          <ul>
            <li><a routerLink="/newsroom">Novedades</a></li>
            <li><a routerLink="/about">Sobre Nosotros</a></li>
            <li><a routerLink="/careers">Empleo</a></li>
            <li><a routerLink="/investors">Inversionistas</a></li>
          </ul>

          <h2>Legal</h2>
          <ul>
            <li><a routerLink="/privacy">Política de Privacidad</a></li>
            <li><a routerLink="/terms">Términos y Condiciones</a></li>
            <li><a routerLink="/company-data">Datos de la Empresa</a></li>
          </ul>
        </div>
      </div>
    </ion-content>
  `,
  styleUrls: ['./static-shared.css'],
})
export class SitemapPage { }
