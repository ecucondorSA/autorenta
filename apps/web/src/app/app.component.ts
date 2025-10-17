import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-ivory-soft text-smoke-black">
      <!-- Header Premium Neutro -->
      <header class="bg-white-pure border-b border-pearl-gray/30 sticky top-0 z-50 backdrop-blur-sm bg-white-pure/95">
        <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <!-- Logo -->
          <a routerLink="/" class="text-2xl font-bold tracking-tight text-smoke-black hover:text-charcoal-medium transition-colors">
            Autorent
          </a>

          <!-- Navigation -->
          <nav class="flex items-center gap-6 text-sm font-semibold">
            <a
              routerLink="/cars"
              routerLinkActive="text-accent-petrol"
              [routerLinkActiveOptions]="{exact: false}"
              class="text-charcoal-medium hover:text-smoke-black transition-colors"
            >
              Buscar
            </a>
            <ng-container *ngIf="isAuthenticated()">
              <a
                routerLink="/cars/publish"
                routerLinkActive="text-accent-petrol"
                class="text-charcoal-medium hover:text-smoke-black transition-colors"
              >
                Publicar
              </a>
              <a
                routerLink="/bookings"
                routerLinkActive="text-accent-petrol"
                class="text-charcoal-medium hover:text-smoke-black transition-colors"
              >
                Mis reservas
              </a>
              <a
                routerLink="/profile"
                routerLinkActive="text-accent-petrol"
                class="text-charcoal-medium hover:text-smoke-black transition-colors"
              >
                Perfil
              </a>
            </ng-container>
            <a
              *ngIf="!isAuthenticated()"
              routerLink="/auth/login"
              class="btn-secondary text-sm px-4 py-2"
            >
              Ingresar
            </a>
          </nav>
        </div>
      </header>

      <!-- Main Content -->
      <main class="mx-auto max-w-7xl px-6 py-10">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer Premium Neutro -->
      <footer class="bg-sand-light border-t border-pearl-gray mt-20">
        <div class="mx-auto max-w-7xl px-6 py-12">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <!-- Brand -->
            <div class="col-span-1">
              <h3 class="text-xl font-bold text-smoke-black mb-3">Autorent</h3>
              <p class="text-sm text-charcoal-medium leading-relaxed">
                Alquiler de autos premium en Argentina. Confianza, calidad y servicio.
              </p>
            </div>

            <!-- Links -->
            <div>
              <h4 class="text-sm font-semibold text-smoke-black mb-3">Explorar</h4>
              <ul class="space-y-2 text-sm text-charcoal-medium">
                <li><a routerLink="/cars" class="hover:text-accent-petrol transition-colors">Buscar autos</a></li>
                <li><a routerLink="/cars/publish" class="hover:text-accent-petrol transition-colors">Publicar auto</a></li>
              </ul>
            </div>

            <div>
              <h4 class="text-sm font-semibold text-smoke-black mb-3">Legal</h4>
              <ul class="space-y-2 text-sm text-charcoal-medium">
                <li><a href="#" class="hover:text-accent-petrol transition-colors">Términos y condiciones</a></li>
                <li><a href="#" class="hover:text-accent-petrol transition-colors">Política de privacidad</a></li>
              </ul>
            </div>

            <div>
              <h4 class="text-sm font-semibold text-smoke-black mb-3">Contacto</h4>
              <ul class="space-y-2 text-sm text-charcoal-medium">
                <li>info@autorent.com.ar</li>
                <li>+54 11 1234-5678</li>
              </ul>
            </div>
          </div>

          <!-- Copyright -->
          <div class="pt-6 border-t border-pearl-gray/50">
            <p class="text-xs text-ash-gray text-center">
              © 2025 Autorent. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
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
