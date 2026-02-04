import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-owner-resources',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="static-page">
      <section class="static-hero" style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);">
        <h1>📚 Recursos para Propietarios</h1>
        <p>Herramientas y guías para maximizar tus ganancias</p>
      </section>

      <div class="static-content">
        <h2>Guías y Tutoriales</h2>
        <div class="card-grid">
          <div class="info-card">
            <h3>📸 Cómo tomar buenas fotos</h3>
            <p>Aprende a fotografiar tu auto para atraer más arrendatarios.</p>
          </div>
          <div class="info-card">
            <h3>💵 Estrategias de precio</h3>
            <p>Optimiza tu precio según temporada y demanda.</p>
          </div>
          <div class="info-card">
            <h3>⭐ Obtener 5 estrellas</h3>
            <p>Consejos para ofrecer una experiencia excepcional.</p>
          </div>
          <div class="info-card">
            <h3>🔧 Mantenimiento preventivo</h3>
            <p>Mantén tu auto en perfectas condiciones.</p>
          </div>
        </div>

        <h2>Herramientas</h2>
        <ul>
          <li><strong>Calculadora de ganancias:</strong> Estima cuánto puedes ganar</li>
          <li><strong>Plantillas de mensaje:</strong> Respuestas rápidas para arrendatarios</li>
          <li><strong>Checklist de entrega:</strong> No olvides nada en cada handover</li>
        </ul>

        <h2>Comunidad de Propietarios</h2>
        <p>
          Únete a nuestro grupo exclusivo de propietarios donde compartimos
          tips, novedades y experiencias.
        </p>

        <div class="cta-section">
          <h3>¿Aún no eres propietario?</h3>
          <a routerLink="/rent-your-car" class="cta-button">Empezar a Alquilar</a>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./static-shared.css'],
})
export class OwnerResourcesPage {}
