import {Component, computed, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PwaService } from '../../../core/services/pwa.service';

interface CapabilityInfo {
  name: string;
  description: string;
  supported: boolean;
  icon: string;
}

@Component({
  selector: 'app-pwa-capabilities',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslateModule],
  templateUrl: './pwa-capabilities.component.html',
  styleUrl: './pwa-capabilities.component.css',
})
export class PwaCapabilitiesComponent {
  readonly expanded = signal(false);

  readonly capabilities = computed<CapabilityInfo[]>(() => {
    const apis = this.pwaService.getSupportedFuguApis();
    const pwaMetrics = this.pwaService.getPwaMetrics();

    return [
      {
        name: 'PWA Instalable',
        description: 'Instalar la app en tu dispositivo',
        supported: pwaMetrics.isInstallable || pwaMetrics.isStandalone,
        icon: '📱',
      },
      {
        name: 'Notificaciones de Badge',
        description: 'Mostrar contador en el ícono de la app',
        supported: apis.badging,
        icon: '🔴',
      },
      {
        name: 'Selector de Contactos',
        description: 'Compartir con tus contactos directamente',
        supported: apis.contactPicker,
        icon: '👥',
      },
      {
        name: 'Compartir Nativo',
        description: 'Compartir contenido con otras apps',
        supported: apis.webShare,
        icon: '📤',
      },
      {
        name: 'Portapapeles Avanzado',
        description: 'Copiar texto e imágenes enriquecidas',
        supported: apis.advancedClipboard,
        icon: '📋',
      },
      {
        name: 'Wake Lock',
        description: 'Mantener pantalla encendida durante navegación',
        supported: apis.wakeLock,
        icon: '🔒',
      },
      {
        name: 'Orientación de Pantalla',
        description: 'Bloquear/desbloquear orientación',
        supported: apis.screenOrientation,
        icon: '🔄',
      },
      {
        name: 'Sincronización en Background',
        description: 'Actualizar datos en segundo plano',
        supported: apis.periodicBackgroundSync,
        icon: '🔄',
      },
    ];
  });

  readonly supportedCount = computed(() => {
    return this.capabilities().filter((c) => c.supported).length;
  });

  readonly totalCount = computed(() => {
    return this.capabilities().length;
  });

  constructor(public pwaService: PwaService) {}

  toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }
}
