import { Injectable, inject, signal, type OnDestroy } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { Bounty } from '@core/models/bounty.model';
import { ScoutAlarmService } from './scout-alarm.service';

export type { Bounty };

@Injectable({
  providedIn: 'root',
})
export class ScoutService implements OnDestroy {
  private supabase = inject(SupabaseClientService).getClient();
  private alarm = inject(ScoutAlarmService);
  private logger = inject(LoggerService);
  private realtimeChannel: RealtimeChannel | null = null;

  readonly activeMissions = signal<Bounty[]>([]);

  setupRealtimeListener() {
    if (this.realtimeChannel) return;

    this.realtimeChannel = this.supabase
      .channel('public:bounties')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bounties' },
        async (payload: { new: { id: string } }) => {
          this.logger.info('NUEVA MISIÓN DETECTADA:', payload.new);

          const { data: mission } = await this.supabase
            .from('bounties')
            .select('*, cars(brand, model, color, license_plate, photos)')
            .eq('id', payload.new.id)
            .single();

          if (mission) {
            this.activeMissions.update((prev) => [mission, ...prev]);
            this.alarm.triggerMissionAlert(mission);
          }
        },
      )
      .subscribe();
  }

  cleanup() {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  ngOnDestroy() {
    this.cleanup();
  }

  async getNearbyMissions(lat: number, lng: number) {
    // Usamos la función RPC que definimos en la migración
    const { data, error } = await this.supabase.rpc('find_nearby_bounties', {
      user_lat: lat,
      user_long: lng,
      search_radius_meters: 5000, // 5km por defecto
    });

    if (error) {
      this.logger.error('Error fetching missions:', { error });
      return [];
    }

    // Enriquecer con datos del auto (necesitamos un join manual si RPC no lo hace)
    const missionIds = (data as { id: string }[]).map((b) => b.id);
    const { data: enrichedData } = await this.supabase
      .from('bounties')
      .select(
        `
        *,
        cars (
          brand, model, color, license_plate, year, photos
        )
      `,
      )
      .in('id', missionIds);

    if (enrichedData) {
      this.activeMissions.set(enrichedData as unknown as Bounty[]);
    }

    return enrichedData;
  }

  async submitClaim(bountyId: string, photoFile: File, lat: number, lng: number) {
    const fileName = `${bountyId}_${Date.now()}.jpg`;

    // 1. Subir Foto a Storage
    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from('evidence')
      .upload(fileName, photoFile);

    if (uploadError) throw uploadError;

    // 2. Crear Registro de Claim
    const { data: claim, error: claimError } = await this.supabase
      .from('bounty_claims')
      .insert({
        bounty_id: bountyId,
        scout_id: (await this.supabase.auth.getUser()).data.user?.id,
        photo_url: uploadData.path,
        gps_location: `POINT(${lng} ${lat})`,
        status: 'PENDING',
      })
      .select()
      .single();

    if (claimError) throw claimError;

    // 3. Invocar Validación IA (Edge Function)
    // No esperamos el resultado aquí (es asíncrono), la función actualizará el claim
    this.supabase.functions.invoke('verify-bounty-photo', {
      body: { claim_id: claim.id },
    });

    return claim;
  }
}
