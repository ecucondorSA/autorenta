import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-server-error',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-surface-base px-6 text-center">
      <div class="max-w-md w-full animate-fade-in-up">
        <!-- Illustration Placeholder -->
        <div class="mb-8 relative w-48 h-48 mx-auto opacity-90 text-error-500">
             <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full text-current">
                <path d="M12 9V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 21.41H5.94C4.52 21.41 3.65 19.86 4.38 18.63L9.5 9.99L12 5.76L14.5 9.99L19.62 18.63C20.35 19.86 19.48 21.41 18.06 21.41H12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M11.995 17H12.004" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
             </svg>
             <div class="absolute -bottom-2 right-4 text-6xl font-black text-text-primary tabular-nums tracking-tighter drop-shadow-sm">500</div>
        </div>

        <h1 class="text-3xl md:text-4xl font-bold text-text-primary mb-3">
          {{ 'error.server_error.title' | translate }}
        </h1>
        
        <p class="text-text-secondary text-lg mb-8 leading-relaxed">
          {{ 'error.server_error.description' | translate }}
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button (click)="reload()" class="btn-primary w-full sm:w-auto min-w-[160px] flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ 'common.retry' | translate }}
          </button>
          
          <a routerLink="/" class="btn-ghost w-full sm:w-auto min-w-[160px] flex items-center justify-center gap-2">
            {{ 'common.go_home' | translate }}
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
export class ServerErrorPage {
  reload() {
    window.location.reload();
  }
}
