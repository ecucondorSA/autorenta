import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-slate-50 text-slate-900">
      <header class="bg-white shadow-sm">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <a routerLink="/" class="text-xl font-semibold tracking-tight">AutorentA</a>
          <nav class="flex items-center gap-4 text-sm font-medium">
            <a routerLink="/cars" routerLinkActive="text-blue-600" class="hover:text-blue-500">
              Buscar
            </a>
            <ng-container *ngIf="isAuthenticated()">
              <a routerLink="/cars/publish" routerLinkActive="text-blue-600" class="hover:text-blue-500">
                Publicar
              </a>
              <a routerLink="/bookings" routerLinkActive="text-blue-600" class="hover:text-blue-500">
                Mis reservas
              </a>
              <a routerLink="/profile" routerLinkActive="text-blue-600" class="hover:text-blue-500">
                Mi perfil
              </a>
            </ng-container>
            <a *ngIf="!isAuthenticated()" routerLink="/auth/login" class="rounded border border-blue-500 px-3 py-1 text-blue-600 hover:bg-blue-50">
              Ingresar
            </a>
          </nav>
        </div>
      </header>
      <main class="mx-auto max-w-6xl px-4 py-8">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly authService = inject(AuthService);
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());
}
