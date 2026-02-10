import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
  PLATFORM_ID,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to service facade
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

// Window Controls Overlay API types
interface WindowControlsOverlay extends EventTarget {
  visible: boolean;
  getTitlebarAreaRect(): DOMRect;
}

interface WindowControlsOverlayGeometryChangeEvent extends Event {
  titlebarAreaRect: DOMRect;
  visible: boolean;
}

interface NavigatorWithWCO extends Navigator {
  windowControlsOverlay?: WindowControlsOverlay;
}

interface UserProfile {
  avatar_url?: string;
  full_name?: string;
}

@Component({
  selector: 'app-pwa-titlebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './pwa-titlebar.component.html',
  styleUrls: ['./pwa-titlebar.component.css'],
})
export class PwaTitlebarComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly supabase = injectSupabase();
  private readonly router = inject(Router);

  readonly isWCOSupported = signal(false);
  readonly isWCOActive = signal(false);
  readonly titlebarRect = signal<DOMRect | null>(null);
  readonly userProfile = signal<UserProfile | null>(null);

  readonly isAuthenticated = computed(() => !!this.userProfile());

  private wcoGeometryChangeHandler?: (event: Event) => void;
  private wcoRef?: WindowControlsOverlay;

  ngOnInit(): void {
    if (!this.isBrowser) return;

    // Detectar si Window Controls Overlay está disponible
    const nav = navigator as NavigatorWithWCO;
    if (nav.windowControlsOverlay) {
      this.isWCOSupported.set(true);

      const wco = nav.windowControlsOverlay;
      this.wcoRef = wco;

      // Verificar si WCO está activo
      if (wco.visible) {
        this.isWCOActive.set(true);
        this.updateTitlebarRect(wco.getTitlebarAreaRect());
      }

      // Escuchar cambios en WCO
      this.wcoGeometryChangeHandler = (event: Event) => {
        const geometryEvent = event as WindowControlsOverlayGeometryChangeEvent;
        this.isWCOActive.set(geometryEvent.visible);
        if (geometryEvent.visible) {
          this.updateTitlebarRect(geometryEvent.titlebarAreaRect);
        }
      };
      wco.addEventListener('geometrychange', this.wcoGeometryChangeHandler);
    }

    // Cargar perfil del usuario
    this.loadUserProfile();
  }

  ngOnDestroy(): void {
    if (this.wcoRef && this.wcoGeometryChangeHandler) {
      this.wcoRef.removeEventListener('geometrychange', this.wcoGeometryChangeHandler);
    }
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
