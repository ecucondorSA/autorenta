import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnInit,
  Output,
  signal,
} from '@angular/core';


/**
 * Splash Screen Component
 * Displays animated logo during app initialization
 */
@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [],
  template: `
    @if (visible()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100"
        [class.opacity-0]="fadeOut()"
        [class.pointer-events-none]="fadeOut()"
        style="transition: opacity 0.5s ease-out"
        >
        <!-- Logo SVG Animado -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 500 280"
          class="w-[90vw] max-w-[500px] h-auto"
          aria-label="Autorentar - Cargando"
          >
          <defs>
            <!-- Gradientes -->
            <linearGradient id="splash-carGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#374151"/>
              <stop offset="50%" style="stop-color:#1f2937"/>
              <stop offset="100%" style="stop-color:#111827"/>
            </linearGradient>
            <linearGradient id="splash-windowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#e0f2fe"/>
              <stop offset="100%" style="stop-color:#7dd3fc"/>
            </linearGradient>
            <linearGradient id="splash-rimGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#94a3b8"/>
              <stop offset="50%" style="stop-color:#64748b"/>
              <stop offset="100%" style="stop-color:#475569"/>
            </linearGradient>
            <filter id="splash-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.15"/>
            </filter>
            <style>
              @keyframes splash-wheelSpin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes splash-carMove {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(15px); }
          }
          @keyframes splash-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes splash-fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .splash-car { animation: splash-carMove 2s ease-in-out infinite; }
      .splash-wheel { animation: splash-wheelSpin 1s linear infinite; }
      .splash-text { animation: splash-fadeInUp 0.8s ease-out forwards; }
      .splash-subtitle { animation: splash-fadeInUp 0.8s ease-out 0.3s forwards; opacity: 0; }
      .splash-loader { animation: splash-pulse 1.5s ease-in-out infinite; }
    </style>
    </defs>
    <!-- Auto animado -->
    <g class="splash-car" filter="url(#splash-shadow)" transform="translate(100, 60)">
      <!-- Sombra -->
      <ellipse cx="150" cy="130" rx="120" ry="10" fill="#000" opacity="0.12"/>
      <!-- Carrocería -->
          <path fill="url(#splash-carGradient)" d="
            M 20,95
            C 20,85 25,70 40,60
            L 60,50
            C 75,42 90,30 110,20
            C 120,14 135,10 160,10
            L 220,12
            C 250,12 270,20 285,40
            L 300,60
            C 315,65 325,80 325,95
            L 325,105
            C 325,110 322,112 318,112
            L 290,112
            C 285,95 265,88 245,88
            C 220,88 205,105 200,112
            L 100,112
            C 95,105 80,88 55,88
            C 35,88 20,105 15,112
            L 10,112
            C 5,112 2,110 2,105
            L 2,95
            Z"/>
      <!-- Techo -->
          <path fill="#111827" d="
            M 110,20 C 120,14 135,10 160,10 L 220,12 C 235,12 250,15 265,25
            L 220,14 L 160,12 C 145,12 125,16 110,20 Z"/>
      <!-- Reflejo -->
          <path fill="#fff" opacity="0.2" d="
            M 115,22 C 130,15 155,12 180,14 L 210,16 L 250,30 L 280,55 L 80,55 C 95,35 105,25 115,22 Z"/>
      <!-- Ventanas -->
      <path fill="url(#splash-windowGrad)" d="M 95,28 C 90,38 85,48 82,58 L 115,58 L 115,28 C 108,27 100,27 95,28 Z"/>
      <path fill="url(#splash-windowGrad)" d="M 122,26 L 190,28 C 210,30 230,42 248,58 L 122,58 Z"/>
      <rect x="115" y="26" width="5" height="32" fill="#1f2937"/>
      <!-- Línea cromada -->
      <path fill="none" stroke="#9ca3af" stroke-width="1.5" opacity="0.6" d="M 25,90 C 100,88 200,88 315,100"/>
      <!-- Rueda trasera -->
      <g transform="translate(55, 112)">
        <circle r="22" fill="#0f172a"/>
        <circle r="18" fill="#374151"/>
        <circle r="14" fill="url(#splash-rimGradient)"/>
        <g class="splash-wheel" style="transform-origin: center">
          <g fill="#64748b">
            <rect x="-2" y="-12" width="4" height="10" rx="1"/>
            <rect x="-2" y="-12" width="4" height="10" rx="1" transform="rotate(72)"/>
            <rect x="-2" y="-12" width="4" height="10" rx="1" transform="rotate(144)"/>
            <rect x="-2" y="-12" width="4" height="10" rx="1" transform="rotate(216)"/>
            <rect x="-2" y="-12" width="4" height="10" rx="1" transform="rotate(288)"/>
          </g>
        </g>
        <circle r="5" fill="#475569"/>
        <circle r="3" fill="#94a3b8"/>
      </g>
      <!-- Rueda delantera -->
      <g transform="translate(245, 112)">
        <circle r="22" fill="#0f172a"/>
        <circle r="18" fill="#374151"/>
        <circle r="14" fill="url(#splash-rimGradient)"/>
        <g class="splash-wheel" style="transform-origin: center">
          <g fill="#64748b">
            <rect x="-2" y="-12" width="4" height="10" rx="1"/>
            <rect x="-2" y="-12" width="4" height="10" rx="1" transform="rotate(72)"/>
            <rect x="-2" y="-12" width="4" height="10" rx="1" transform="rotate(144)"/>
            <rect x="-2" y="-12" width="4" height="10" rx="1" transform="rotate(216)"/>
            <rect x="-2" y="-12" width="4" height="10" rx="1" transform="rotate(288)"/>
          </g>
        </g>
        <circle r="5" fill="#475569"/>
        <circle r="3" fill="#94a3b8"/>
      </g>
      <!-- Faro -->
      <ellipse cx="318" cy="75" rx="5" ry="10" fill="#fef9c3"/>
      <ellipse cx="318" cy="75" rx="2" ry="5" fill="#fff"/>
      <!-- Luz trasera -->
      <rect x="5" y="70" width="5" height="15" rx="2" fill="#dc2626"/>
      <!-- Badge -->
      <circle cx="320" cy="92" r="5" fill="#d4f542"/>
    </g>
    <!-- Texto -->
    <text x="250" y="215" text-anchor="middle" class="splash-text"
      font-family="system-ui, -apple-system, sans-serif" font-size="42" font-weight="800" fill="#1e293b">
      AUTO<tspan fill="#d4f542">RENTAR</tspan>
    </text>
    <text x="250" y="245" text-anchor="middle" class="splash-subtitle"
      font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="#64748b" letter-spacing="3">
      ALQUILER ENTRE PERSONAS
    </text>
    <!-- Loading indicator -->
    <g class="splash-loader" transform="translate(225, 260)">
      <circle cx="10" cy="5" r="3" fill="#d4f542"/>
      <circle cx="25" cy="5" r="3" fill="#d4f542" opacity="0.7"/>
      <circle cx="40" cy="5" r="3" fill="#d4f542" opacity="0.4"/>
    </g>
    </svg>
    </div>
    }
    `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplashScreenComponent implements OnInit {
  @Output() splashComplete = new EventEmitter<void>();

  visible = signal(true);
  fadeOut = signal(false);

  ngOnInit(): void {
    // Auto-hide after animation
    setTimeout(() => {
      this.fadeOut.set(true);
      setTimeout(() => {
        this.visible.set(false);
        this.splashComplete.emit();
      }, 500);
    }, 2000); // Show for 2 seconds
  }
}
