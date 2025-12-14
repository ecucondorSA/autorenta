import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { AuthService } from './auth.service';
import { FeatureFlagService } from './feature-flag.service';
import { IncidentDetectorService } from './incident-detector.service';
import { LoggerService } from './logger.service';
import { injectSupabase } from './supabase-client.service';

type ActiveBookingRow = {
  id: string;
  status: string;
  renter_id: string | null;
  created_at: string | null;
};

@Injectable({ providedIn: 'root' })
export class TripSafetyService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly supabase = injectSupabase();

  private readonly authService = inject(AuthService);
  private readonly featureFlags = inject(FeatureFlagService);
  private readonly incidentDetector = inject(IncidentDetectorService);
  private readonly logger = inject(LoggerService).createChildLogger('TripSafetyService');

  private pollId: ReturnType<typeof setInterval> | null = null;
  private activeBookingId: string | null = null;
  private lastUserId: string | null = null;
  private syncing = false;

  // Polling is a conservative fallback (works even without Realtime replication configured).
  private readonly POLL_MS = 60_000;

  constructor() {
    if (!this.isBrowser) return;
    if (!Capacitor.isNativePlatform()) return;

    effect(() => {
      const userId = this.authService.sessionSignal()?.user?.id ?? null;

      if (!userId) {
        void this.stop();
        return;
      }

      if (this.lastUserId !== userId) {
        this.lastUserId = userId;
        this.activeBookingId = null;
        void this.incidentDetector.stopMonitoring();
      }

      if (!this.pollId) {
        void this.triggerSync();
        this.pollId = setInterval(() => void this.triggerSync(), this.POLL_MS);
      }
    });
  }

  async triggerSync(): Promise<void> {
    if (!this.isBrowser) return;
    if (!Capacitor.isNativePlatform()) return;
    if (this.syncing) return;

    this.syncing = true;
    try {
      await this.syncActiveTrip();
    } finally {
      this.syncing = false;
    }
  }

  async stop(): Promise<void> {
    if (this.pollId) {
      clearInterval(this.pollId);
      this.pollId = null;
    }

    this.lastUserId = null;
    this.activeBookingId = null;
    await this.incidentDetector.stopMonitoring();
  }

  private async syncActiveTrip(): Promise<void> {
    const userId = this.authService.sessionSignal()?.user?.id ?? null;
    if (!userId) {
      await this.stop();
      return;
    }

    if (!this.featureFlags.isEnabled('incident_detector')) {
      if (this.activeBookingId) {
        this.activeBookingId = null;
        await this.incidentDetector.stopMonitoring();
      }
      return;
    }

    try {
      const { data, error } = await this.supabase
        .from('my_bookings')
        .select('id, status, renter_id, created_at')
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const rows = (data ?? []) as ActiveBookingRow[];
      const activeRenterBooking = rows.find((b) => b.renter_id === userId) ?? null;

      if (!activeRenterBooking) {
        if (this.activeBookingId) {
          this.activeBookingId = null;
          await this.incidentDetector.stopMonitoring();
        }
        return;
      }

      if (this.activeBookingId === activeRenterBooking.id) {
        return;
      }

      if (this.activeBookingId) {
        await this.incidentDetector.stopMonitoring();
      }

      this.activeBookingId = activeRenterBooking.id;
      await this.incidentDetector.startMonitoring(activeRenterBooking.id);
    } catch (err) {
      this.logger.warn('trip-safety-sync-failed', err);
    }
  }
}

