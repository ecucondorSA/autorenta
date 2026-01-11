import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-careers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Trabaja con Nosotros</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="static-page">
        <section class="static-hero" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);">
          <h1>💼 Únete a Autorentar</h1>
          <p>Construye el futuro de la movilidad con nosotros</p>
        </section>

        <div class="static-content">
          <h2>¿Por qué trabajar con nosotros?</h2>
          <div class="card-grid">
            <div class="info-card">
              <h3>🚀 Impacto Real</h3>
              <p>Tu trabajo mejora la vida de miles de personas cada día.</p>
            </div>
            <div class="info-card">
              <h3>🏡 Trabajo Flexible</h3>
              <p>Esquema híbrido con oficina en Buenos Aires.</p>
            </div>
            <div class="info-card">
              <h3>📈 Crecimiento</h3>
              <p>Oportunidades de desarrollo profesional constante.</p>
            </div>
            <div class="info-card">
              <h3>🎯 Cultura Startup</h3>
              <p>Ambiente dinámico, sin burocracia.</p>
            </div>
          </div>

          <h2>Posiciones Abiertas</h2>
          <div class="card-grid">
            <div class="info-card">
              <h3>Senior Frontend Developer</h3>
              <p>Angular, TypeScript, Ionic. Remoto.</p>
            </div>
            <div class="info-card">
              <h3>Backend Developer</h3>
              <p>Supabase, PostgreSQL, Edge Functions. Remoto.</p>
            </div>
            <div class="info-card">
              <h3>Product Designer</h3>
              <p>UI/UX, Figma, Design Systems. Híbrido.</p>
            </div>
          </div>

          <h2>Proceso de Selección</h2>
          <ul>
            <li>Revisión de CV y portfolio</li>
            <li>Entrevista telefónica (20 min)</li>
            <li>Challenge técnico (para roles técnicos)</li>
            <li>Entrevista final con el equipo</li>
            <li>Oferta y bienvenida 🎉</li>
          </ul>

          <div class="cta-section">
            <h3>¿Interesado?</h3>
            <p>Envía tu CV a <strong>jobs&#64;autorentar.com.ar</strong></p>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styleUrls: ['./static-shared.css'],
})
export class CareersPage { }
