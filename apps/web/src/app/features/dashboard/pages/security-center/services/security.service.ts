import { Injectable, signal } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  private supabase = injectSupabase();

  // State Signals
  readonly devices = signal<SecurityDevice[]>([]);
  readonly activeAlerts = signal<SecurityAlert[]>([]);
  readonly mapCenter = signal<[number, number] | null>(null);

  private realtimeSubscription?: RealtimeChannel;

  async loadDashboardData(carId: string) {
    // 1. Cargar Dispositivos
    const { data: devices } = await this.supabase
      .from('car_security_devices')
      .select('*')
      .eq('car_id', carId);

    if (devices) this.devices.set(devices as SecurityDevice[]);

    // 2. Cargar Alertas Activas
    const { data: alerts } = await this.supabase
      .from('security_alerts')
      .select('*')
      .eq('booking_id', 'current_booking_id_placeholder') // TODO: Get active booking
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    if (alerts) this.activeAlerts.set(alerts as SecurityAlert[]);

    // 3. Suscribirse a cambios en tiempo real
    this.subscribeToRealtime(carId);
  }

  private subscribeToRealtime(carId: string) {
    this.realtimeSubscription = this.supabase
      .channel(`security-${carId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'security_alerts' },
        (payload) => {
          const newAlert = payload.new as SecurityAlert;
          this.activeAlerts.update((current) => [newAlert, ...current]);
          // TODO: Trigger sound/toast
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bounty_claims' },
        (payload) => {
          // Alerta crítica: Scout encontró el auto
          console.log('BOUNTY CLAIMED!', payload.new);
        },
      )
      .subscribe();
  }

  // Acciones Tácticas
  async triggerBounty(carId: string, location: { lat: number; lng: number }) {
    return await this.supabase.from('bounties').insert({
      car_id: carId,
      target_location: `POINT(${location.lng} ${location.lat})`,
      status: 'ACTIVE',
    });
  }

  async generateDossier(claimId: string) {
    return await this.supabase.functions.invoke('generate-recovery-dossier', {
      body: { claim_id: claimId },
    });
  }
}
