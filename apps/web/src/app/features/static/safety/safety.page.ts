import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-safety',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="static-page">
      <section
        class="static-hero"
        style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);"
      >
        <h1>🔒 Tu Seguridad es Nuestra Prioridad</h1>
        <p>Conoce las medidas que tomamos para protegerte</p>
      </section>

      <div class="static-content">
        <h2>Verificación de Identidad</h2>
        <p>
          Todos los usuarios de Autorentar pasan por un proceso de verificación que incluye
          validación de identidad, licencia de conducir y datos de pago.
        </p>

        <div class="card-grid">
          <div class="info-card">
            <h3>📱 Verificación Facial</h3>
            <p>Comparamos tu selfie con tu documento de identidad usando IA.</p>
          </div>
          <div class="info-card">
            <h3>🪪 Validación de Licencia</h3>
            <p>Verificamos que tu licencia de conducir sea válida y esté vigente.</p>
          </div>
          <div class="info-card">
            <h3>📍 Tracking GPS</h3>
            <p>Los propietarios pueden optar por compartir ubicación durante el alquiler.</p>
          </div>
        </div>

        <h2>Comunicación Segura</h2>
        <p>
          Todo el chat entre arrendatarios y propietarios está encriptado. Nunca compartas
          información personal fuera de la plataforma.
        </p>

        <h2>Consejos de Seguridad</h2>
        <ul>
          <li>Siempre realiza la inspección del vehículo con video</li>
          <li>No aceptes pagos fuera de la plataforma</li>
          <li>Reporta cualquier comportamiento sospechoso</li>
          <li>Mantén tu información de contacto actualizada</li>
        </ul>

        <div class="cta-section">
          <h3>¿Viste algo sospechoso?</h3>
          <p>Reporta cualquier problema de seguridad inmediatamente</p>
          <a routerLink="/support" class="cta-button">Reportar Problema</a>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./static-shared.css'],
})
export class SafetyPage {}
