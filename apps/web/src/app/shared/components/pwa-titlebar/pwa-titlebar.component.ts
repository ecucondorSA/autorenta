import { Component, OnInit, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { injectSupabase } from '../../../core/services/supabase-client.service';

@Component({
  selector: 'app-pwa-titlebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pwa-titlebar.component.html',
  styleUrls: ['./pwa-titlebar.component.css'],
})
export class PwaTitlebarComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly supabase = injectSupabase();
  private readonly router = inject(Router);

  readonly isWCOSupported = signal(false);
  readonly isWCOActive = signal(false);
  readonly titlebarRect = signal<DOMRect | null>(null);
  readonly userProfile = signal<unknown>(null);

  readonly isAuthenticated = computed(() => !!this.userProfile());

  ngOnInit(): void {
    if (!this.isBrowser) return;

    // Detectar si Window Controls Overlay está disponible
    if ('windowControlsOverlay' in navigator) {
      this.isWCOSupported.set(true);

      const wco = (navigator as any).windowControlsOverlay;

      // Verificar si WCO está activo
      if (wco.visible) {
        this.isWCOActive.set(true);
        this.updateTitlebarRect(wco.getTitlebarAreaRect());
      }

      // Escuchar cambios en WCO
      wco.addEventListener('geometrychange', (event: any) => {
        this.isWCOActive.set(event.visible);
        if (event.visible) {
          this.updateTitlebarRect(event.titlebarAreaRect);
        }
      });
    }

    // Cargar perfil del usuario
    this.loadUserProfile();
  }

  private updateTitlebarRect(rect: DOMRect): void {
    this.titlebarRect.set(rect);
  }

  private async loadUserProfile(): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (user) {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      this.userProfile.set(profile);
    }
  }

  navigateToSearch(): void {
    this.router.navigate(['/cars']);
  }

  navigateToProfile(): void {
    if (this.isAuthenticated()) {
      this.router.navigate(['/profile']);
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  navigateToHome(): void {
    this.router.navigate(['/']);
  }
}
