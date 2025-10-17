import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash-loader',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host { display: contents; }

    /* Prefer reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .motion-ok { animation: none !important; }
    }

    /* Custom keyframes for subtle bobbing of the wheel */
    @keyframes bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }

    /* Speedometer needle sweep */
    @keyframes sweep {
      0% { transform: rotate(-60deg); }
      50% { transform: rotate(40deg); }
      100% { transform: rotate(-60deg); }
    }

    @keyframes roadmove {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }
  `],
  template: `
    <div class="fixed inset-0 z-[9999] bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center gap-8">
      <!-- Logo/Wordmark -->
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-2xl bg-white/10 backdrop-blur-sm grid place-items-center shadow-inner">
          <!-- Minimal wheel glyph -->
          <svg viewBox="0 0 100 100" class="h-6 w-6" aria-hidden="true">
            <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="8" opacity="0.7"/>
            <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" stroke-width="6"/>
            <circle cx="50" cy="50" r="4" fill="currentColor"/>
          </svg>
        </div>
        <span class="text-2xl tracking-tight font-semibold">AutorentA</span>
      </div>

      <!-- Wheel spinner + road strip -->
      <div class="relative">
        <!-- Rotating tire -->
        <div class="motion-ok animate-spin h-28 w-28 rounded-full grid place-items-center shadow-2xl shadow-black/50 bg-neutral-900 border border-white/10" style="animation-duration: 800ms;">
          <svg viewBox="0 0 100 100" class="h-24 w-24 motion-ok" style="animation: bob 1.8s ease-in-out infinite;">
            <!-- Tire -->
            <circle cx="50" cy="50" r="46" fill="none" stroke="white" stroke-opacity="0.12" stroke-width="8"/>
            <!-- Rim -->
            <circle cx="50" cy="50" r="28" fill="none" stroke="white" stroke-opacity="0.25" stroke-width="6"/>
            <!-- 5 spokes -->
            <g stroke="white" stroke-width="5" stroke-linecap="round" stroke-opacity="0.9">
              <line x1="50" y1="50" x2="50" y2="18" />
              <line x1="50" y1="50" x2="77" y2="36" />
              <line x1="50" y1="50" x2="77" y2="64" />
              <line x1="50" y1="50" x2="50" y2="82" />
              <line x1="50" y1="50" x2="23" y2="64" />
            </g>
            <circle cx="50" cy="50" r="6" fill="white"/>
          </svg>
        </div>
        <!-- Road center lines animation -->
        <div class="absolute left-1/2 -translate-x-1/2 top-full mt-6 h-1 w-64 overflow-hidden rounded-full bg-white/10">
          <div class="h-full w-[200%] bg-[repeating-linear-gradient(to_right,theme(colors.white)_0_16px,transparent_16px_28px)] motion-ok" style="animation: roadmove 1s linear infinite;"></div>
        </div>
      </div>

      <!-- Tagline / helpful text -->
      <div class="text-center text-sm text-neutral-300 px-6">
        Preparando tu experiencia de alquiler…
      </div>

      <!-- Speedometer -->
      <div class="relative w-40 h-20">
        <svg viewBox="0 0 200 100" class="absolute inset-0 w-full h-full">
          <path d="M20 90 A80 80 0 0 1 180 90" fill="none" stroke="white" stroke-opacity="0.2" stroke-width="10"/>
          <circle cx="100" cy="90" r="4" fill="white"/>
        </svg>
        <div class="absolute left-1/2 top-[68%] origin-[50%_100%] motion-ok" style="transform: translateX(-50%) rotate(-60deg); animation: sweep 1.8s ease-in-out infinite;">
          <div class="w-0.5 h-16 bg-white rounded-full shadow" aria-hidden="true"></div>
        </div>
      </div>
    </div>
  `
})
export class SplashLoaderComponent {}
