import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-not-found',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-surface-base px-6 text-center">
      <div class="max-w-md w-full animate-fade-in-up">
        <!-- 404 Illustration -->
        <div class="mb-8 relative w-64 mx-auto">
          <img src="/assets/images/illustrations/illust-404.png" alt="Página no encontrada" class="w-full h-auto" />
          <div class="absolute -bottom-2 right-4 text-6xl font-black text-text-primary tabular-nums tracking-tighter drop-shadow-sm">404</div>
        </div>

        <h1 class="text-3xl md:text-4xl font-bold text-text-primary mb-3">
          {{ 'error.not_found.title' | translate }}
        </h1>
        
        <p class="text-text-secondary text-lg mb-8 leading-relaxed">
          {{ 'error.not_found.description' | translate }}
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a routerLink="/" class="btn-primary w-full sm:w-auto min-w-[160px] flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {{ 'common.go_home' | translate }}
          </a>
          
          <a routerLink="/cars" class="btn-secondary w-full sm:w-auto min-w-[160px] flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {{ 'nav.cars' | translate }}
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class NotFoundPage {}
