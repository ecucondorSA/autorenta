import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-company-data',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Datos de la Empresa</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="static-page">
        <section class="static-hero">
          <h1>🏢 Datos de la Empresa</h1>
          <p>Información legal y fiscal</p>
        </section>

        <div class="static-content">
          <h2>Razón Social</h2>
          <p><strong>Autorentar S.A.</strong></p>

          <h2>Domicilio Legal</h2>
          <p>
            Av. Corrientes 1234, Piso 5<br>
            Ciudad Autónoma de Buenos Aires (C1043AAZ)<br>
            Argentina
          </p>

          <h2>Datos Fiscales</h2>
          <ul>
            <li><strong>CUIT:</strong> 30-12345678-9</li>
            <li><strong>Inicio de Actividades:</strong> Enero 2026</li>
            <li><strong>Inscripción IGJ:</strong> En trámite</li>
          </ul>

          <h2>Contacto</h2>
          <ul>
            <li><strong>Email General:</strong> info&#64;autorentar.com.ar</li>
            <li><strong>Soporte:</strong> soporte&#64;autorentar.com.ar</li>
            <li><strong>Prensa:</strong> prensa&#64;autorentar.com.ar</li>
          </ul>

          <h2>Órgano de Control</h2>
          <p>
            Dirección Nacional de Defensa del Consumidor<br>
            <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor"
               target="_blank" rel="noopener">
              www.argentina.gob.ar/defensadelconsumidor
            </a>
          </p>

          <div class="cta-section">
            <h3>¿Tienes consultas legales?</h3>
            <p>Escríbenos a <strong>legal&#64;autorentar.com.ar</strong></p>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styleUrls: ['../static-shared.css'],
})
export class CompanyDataPage { }
