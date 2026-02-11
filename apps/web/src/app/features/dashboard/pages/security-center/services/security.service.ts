import { inject, Injectable, signal } from '@angular/core';
import { FeatureDataFacadeService } from '@core/services/facades/feature-data-facade.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { RealtimeConnectionService } from '@core/services/infrastructure/realtime-connection.service';

export interface SecurityDevice {
  id: string;
  device_type: 'AIRTAG' | 'SMARTTAG' | 'GPS_HARDWIRED' | 'OBD_KILLSWITCH';
  is_active: boolean;
  battery_level: number;
  last_ping: string;
}

export interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  created_at: string;
  resolved: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private readonly featureData = inject(FeatureDataFacadeService);
  private readonly realtimeConnection = inject(RealtimeConnectionService);
  private readonly logger = inject(LoggerService).createChildLogger('SecurityService');

  // State Signals
  readonly devices = signal<SecurityDevice[]>([]);
  readonly activeAlerts = signal<SecurityAlert[]>([]);
  readonly mapCenter = signal<[number, number] | null>(null);

  private realtimeTopics: string[] = [];

  async loadDashboardData(carId: string, bookingId?: string): Promise<void> {
    // 1. Cargar Dispositivos
    const devices = await this.featureData.listSecurityDevices(carId);
    this.devices.set(devices as unknown as SecurityDevice[]);

    // 2. Cargar Alertas Activas (solo si hay un booking activo)
    if (bookingId) {
      const alerts = await this.featureData.listActiveSecurityAlerts(bookingId);
      this.activeAlerts.set(alerts as unknown as SecurityAlert[]);
    } else {
      // Sin booking activo, no hay alertas que mostrar
      this.activeAlerts.set([]);
    }

    // 3. Suscribirse a cambios en tiempo real
    this.subscribeToRealtime(carId);
  }

  private subscribeToRealtime(carId: string): void {
    // Cleanup previous subscription to avoid zombie channels
    this.cleanupRealtime();

    const alertsChannel = this.realtimeConnection.subscribeWithRetry<Record<string, unknown>>(
      `security-alerts-${carId}`,
      { event: 'INSERT', schema: 'public', table: 'security_alerts' },
      (payload) => {
        const newAlert = payload.new as SecurityAlert;
        this.activeAlerts.update((current) => [newAlert, ...current]);
      },
    );

    const bountyChannel = this.realtimeConnection.subscribeWithRetry<Record<string, unknown>>(
      `security-bounty-${carId}`,
      { event: 'INSERT', schema: 'public', table: 'bounty_claims' },
      (payload) => {
        this.logger.warn('Bounty claimed', payload.new);
      },
    );

    this.realtimeTopics.push(alertsChannel.topic, bountyChannel.topic);
  }

  cleanupRealtime(): void {
    this.realtimeTopics.forEach((topic) => this.realtimeConnection.unsubscribe(topic));
    this.realtimeTopics = [];
  }

  // Acciones Tácticas
  async triggerBounty(carId: string, location: { lat: number; lng: number }): Promise<void> {
    await this.featureData.triggerBounty({
      carId,
      lat: location.lat,
      lng: location.lng,
    });
  }

  async generateDossier(claimId: string): Promise<unknown> {
    return this.featureData.invokeFunction({
      name: 'generate-recovery-dossier',
      body: { claim_id: claimId },
    });
  }
}
