import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-v2-preview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="v2-preview">
      <!-- Hero Section -->
      <div class="hero">
        <div class="container">
          <div class="badge">
            <span class="badge-icon">✨</span>
            <span>En Desarrollo</span>
          </div>
          
          <h1 class="title">
            AutoRenta V2
            <span class="gradient-text">Reimaginado</span>
          </h1>
          
          <p class="subtitle">
            Una nueva experiencia móvil-first. PWA completa con offline-mode, 
            animaciones fluidas y una UX innovadora.
          </p>

          <div class="cta-buttons">
            <a routerLink="/" class="btn btn-primary">
              <span>Volver al inicio</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
            <a href="https://github.com/ecucondorSA/autorenta/tree/v2" target="_blank" class="btn btn-secondary">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"/>
              </svg>
              <span>Ver en GitHub</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Features Grid -->
      <div class="features">
        <div class="container">
          <h2 class="section-title">Características Principales</h2>
          
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">📱</div>
              <h3>PWA Completa</h3>
              <p>Instalable, funciona offline, notificaciones push nativas</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">⚡</div>
              <h3>Ultra Rápida</h3>
              <p>First Paint <1s, animaciones a 60 FPS, bundle <300KB</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">🎨</div>
              <h3>Diseño Moderno</h3>
              <p>Design tokens, componentes reutilizables, dark mode</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">🔄</div>
              <h3>Offline-First</h3>
              <p>Sincronización automática, cache inteligente, background sync</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">🎮</div>
              <h3>Micro-interacciones</h3>
              <p>Feedback háptico, gestos nativos, animaciones fluidas</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">♿</div>
              <h3>Accesible</h3>
              <p>WCAG 2.1 AAA, navegación por voz, keyboard-friendly</p>
            </div>
          </div>
        </div>
      </div>

      <!-- New Features -->
      <div class="new-features">
        <div class="container">
          <h2 class="section-title">Funcionalidades Innovadoras</h2>
          
          <div class="features-list">
            <div class="feature-item">
              <span class="feature-bullet">🎤</span>
              <div>
                <h4>Búsqueda por Voz</h4>
                <p>"Necesito un SUV grande para este fin de semana en Palermo"</p>
              </div>
            </div>

            <div class="feature-item">
              <span class="feature-bullet">📹</span>
              <div>
                <h4>Video Inspection con IA</h4>
                <p>Detección automática de daños pre/post rental</p>
              </div>
            </div>

            <div class="feature-item">
              <span class="feature-bullet">📍</span>
              <div>
                <h4>Live Tracking</h4>
                <p>Ubicación en tiempo real durante viajes activos</p>
              </div>
            </div>

            <div class="feature-item">
              <span class="feature-bullet">⚡</span>
              <div>
                <h4>Instant Booking</h4>
                <p>Reserva sin aprobación para hosts verificados</p>
              </div>
            </div>

            <div class="feature-item">
              <span class="feature-bullet">🧠</span>
              <div>
                <h4>Smart Pricing con ML</h4>
                <p>Sugerencias dinámicas basadas en mercado y eventos</p>
              </div>
            </div>

            <div class="feature-item">
              <span class="feature-bullet">💎</span>
              <div>
                <h4>Wallet con Crypto</h4>
                <p>Soporte para USDT/USDC con conversión automática</p>
              </div>
            </div>

            <div class="feature-item">
              <span class="feature-bullet">🎯</span>
              <div>
                <h4>Gamificación</h4>
                <p>Niveles, logros, leaderboards y recompensas</p>
              </div>
            </div>

            <div class="feature-item">
              <span class="feature-bullet">💬</span>
              <div>
                <h4>Chat Mejorado</h4>
                <p>Quick replies, templates y mensajes de voz</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Progress Section -->
      <div class="progress-section">
        <div class="container">
          <h2 class="section-title">Progreso de Desarrollo</h2>
          
          <div class="progress-list">
            <div class="progress-item completed">
              <div class="progress-icon">✅</div>
              <div class="progress-content">
                <h4>Fase 1: Fundamentos</h4>
                <p>Arquitectura base, PWA setup, sistema de diseño</p>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: 100%"></div>
                </div>
                <span class="progress-label">100% completado</span>
              </div>
            </div>

            <div class="progress-item in-progress">
              <div class="progress-icon">🚧</div>
              <div class="progress-content">
                <h4>Fase 2: Features Core</h4>
                <p>Home, Discover, Car Detail, Booking, Profile</p>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: 0%"></div>
                </div>
                <span class="progress-label">En desarrollo</span>
              </div>
            </div>

            <div class="progress-item pending">
              <div class="progress-icon">⏳</div>
              <div class="progress-content">
                <h4>Fase 3: Features Avanzadas</h4>
                <p>Live tracking, Video inspection, Chat, Wallet crypto</p>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: 0%"></div>
                </div>
                <span class="progress-label">Pendiente</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer CTA -->
      <div class="footer-cta">
        <div class="container">
          <h2>¿Querés ser beta tester?</h2>
          <p>Suscribite para recibir acceso anticipado a AutoRenta V2</p>
          <a routerLink="/referrals" class="btn btn-primary btn-lg">
            Unirme al programa beta
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .v2-preview {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem;
    }

    /* Hero Section */
    .hero {
      padding: 6rem 0 4rem;
      text-align: center;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 2rem;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 2rem;
      backdrop-filter: blur(10px);
    }

    .badge-icon {
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.1); }
    }

    .title {
      font-size: 3.5rem;
      font-weight: 800;
      margin-bottom: 1.5rem;
      line-height: 1.2;
    }

    .gradient-text {
      background: linear-gradient(90deg, #ffd700, #ffed4e);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      font-size: 1.25rem;
      margin-bottom: 2.5rem;
      opacity: 0.95;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.6;
    }

    .cta-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 2rem;
      border-radius: 0.75rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
      border: none;
      font-size: 1rem;
    }

    .btn-primary {
      background: white;
      color: #667eea;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.15);
      color: white;
      backdrop-filter: blur(10px);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .btn-lg {
      padding: 1.25rem 2.5rem;
      font-size: 1.125rem;
    }

    /* Features Section */
    .features {
      padding: 4rem 0;
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
    }

    .section-title {
      text-align: center;
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 3rem;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }

    .feature-card {
      background: rgba(255, 255, 255, 0.1);
      padding: 2rem;
      border-radius: 1rem;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .feature-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .feature-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .feature-card h3 {
      font-size: 1.5rem;
      margin-bottom: 0.75rem;
    }

    .feature-card p {
      opacity: 0.9;
      line-height: 1.6;
    }

    /* New Features */
    .new-features {
      padding: 4rem 0;
    }

    .features-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .feature-item {
      display: flex;
      gap: 1rem;
      padding: 1.5rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 0.75rem;
      backdrop-filter: blur(10px);
    }

    .feature-bullet {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .feature-item h4 {
      font-size: 1.125rem;
      margin-bottom: 0.25rem;
    }

    .feature-item p {
      opacity: 0.85;
      font-size: 0.875rem;
    }

    /* Progress Section */
    .progress-section {
      padding: 4rem 0;
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
    }

    .progress-list {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }

    .progress-item {
      display: flex;
      gap: 1.5rem;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 1rem;
      backdrop-filter: blur(10px);
    }

    .progress-icon {
      font-size: 2.5rem;
      flex-shrink: 0;
    }

    .progress-content {
      flex: 1;
    }

    .progress-content h4 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .progress-content p {
      opacity: 0.9;
      margin-bottom: 1rem;
    }

    .progress-bar {
      height: 8px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 1rem;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #34d399);
      border-radius: 1rem;
      transition: width 1s ease-out;
    }

    .progress-label {
      font-size: 0.875rem;
      opacity: 0.8;
    }

    /* Footer CTA */
    .footer-cta {
      padding: 4rem 0;
      text-align: center;
    }

    .footer-cta h2 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }

    .footer-cta p {
      font-size: 1.25rem;
      opacity: 0.9;
      margin-bottom: 2rem;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .title {
        font-size: 2.5rem;
      }

      .subtitle {
        font-size: 1.125rem;
      }

      .section-title {
        font-size: 2rem;
      }

      .features-grid,
      .features-list {
        grid-template-columns: 1fr;
      }

      .progress-item {
        flex-direction: column;
        text-align: center;
      }

      .cta-buttons {
        flex-direction: column;
      }

      .btn {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class V2PreviewPage {}
