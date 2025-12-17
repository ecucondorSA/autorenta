import { Injectable, inject } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Motion } from '@capacitor/motion';
import { SupabaseClientService } from './supabase-client.service';

interface AccelerationEvent {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

interface AccelListenerEvent {
  acceleration?: {
    x?: number | null;
    y?: number | null;
    z?: number | null;
  };
}

@Injectable({ providedIn: 'root' })
export class IncidentDetectorService {
  private supabase = inject(SupabaseClientService).getClient();
  private isMonitoring = false;
  private currentBookingId: string | null = null;
  private accelerationBuffer: AccelerationEvent[] = [];

  private readonly IMPACT_THRESHOLD = 4.0; // 4G force
  private readonly BUFFER_SIZE = 100; // Keep last 100 readings (10 seconds at 10Hz)

  async startMonitoring(bookingId: string): Promise<void> {
    if (!bookingId) return;

    if (this.isMonitoring) {
      if (this.currentBookingId === bookingId) return;
      await this.stopMonitoring();
    }

    this.currentBookingId = bookingId;
    this.isMonitoring = true;
    this.accelerationBuffer = [];

    try {
      // Request permissions
      await LocalNotifications.requestPermissions();

      // Start accelerometer monitoring
      await Motion.addListener('accel', (event: any) => {
        this.handleAccelerationEvent(event);
      });

      console.log('✅ Incident detector started for booking:', bookingId);
    } catch (error) {
      this.isMonitoring = false;
      this.currentBookingId = null;
      this.accelerationBuffer = [];
      console.warn('⚠️ Failed to start incident detector', error);
    }
  }

  async stopMonitoring(): Promise<void> {
    this.isMonitoring = false;
    this.currentBookingId = null;
    this.accelerationBuffer = [];
    await Motion.removeAllListeners();
    console.log('⏹️ Incident detector stopped');
  }

  private handleAccelerationEvent(event: AccelListenerEvent): void {
    const acceleration = event.acceleration;
    if (!acceleration) return;

    const x = acceleration.x ?? 0;
    const y = acceleration.y ?? 0;
    const z = acceleration.z ?? 0;

    // Calculate total G-force
    const gForce = Math.sqrt(x * x + y * y + z * z);

    // Add to buffer
    this.accelerationBuffer.push({
      x,
      y,
      z,
      timestamp: Date.now()
    });

    // Keep buffer size limited
    if (this.accelerationBuffer.length > this.BUFFER_SIZE) {
      this.accelerationBuffer.shift();
    }

    // Check for impact
    if (gForce > this.IMPACT_THRESHOLD) {
      this.handlePotentialIncident(gForce);
    }
  }

  private async handlePotentialIncident(gForce: number): Promise<void> {
    if (!this.currentBookingId) return;

    // Prevent duplicate detections (debounce 30 seconds)
    const lastIncident = localStorage.getItem('last_incident_timestamp');
    if (lastIncident && Date.now() - parseInt(lastIncident) < 30000) {
      return;
    }

    localStorage.setItem('last_incident_timestamp', Date.now().toString());

    // Get current location
    let locationData = { latitude: 0, longitude: 0, speed: 0 };
    try {
      const position = await Geolocation.getCurrentPosition();
      locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        speed: position.coords.speed || 0
      };
    } catch (e) {
      console.warn('Could not get location during incident', e);
    }

    // Create incident report
    const { data: incident, error } = await this.supabase
      .from('incident_reports')
      .insert({
        booking_id: this.currentBookingId,
        detected_at: new Date().toISOString(),
        detection_method: 'accelerometer',
        g_force: gForce,
        location_lat: locationData.latitude,
        location_lng: locationData.longitude,
        speed_mps: locationData.speed,
        acceleration_buffer: this.accelerationBuffer,
        status: 'pending_review'
      })
      .select()
      .single();

    if (error) {
      console['error']('Error saving incident report:', error);
      return;
    }

    // Show notification
    await LocalNotifications.schedule({
      notifications: [{
        title: '⚠️ Posible Incidente Detectado',
        body: `Se detectó un impacto de ${gForce.toFixed(1)}G. ¿Ocurrió un accidente?`,
        id: Date.now(),
        extra: {
          incident_id: incident['id'],
          booking_id: this.currentBookingId
        }
      }]
    });

    // Send push to owner
    await this.notifyOwner(incident['id']);

    console.warn('🚨 INCIDENT DETECTED:', {
      gForce,
      location: locationData,
      incidentId: incident.id
    });
  }

  private async notifyOwner(incidentId: string): Promise<void> {
    if (!this.currentBookingId) return;

    // Get booking details
    const { data: booking } = await this.supabase
      .from('bookings')
      .select('car:cars(owner:profiles(id, email, fcm_token))')
      .eq('id', this.currentBookingId)
      .single();

    type BookingJoin = {
      car?: {
        owner?: {
          fcm_token?: string | null;
        } | null;
      } | null;
    } | null;

    const ownerFcmToken =
      (booking as unknown as BookingJoin)?.['car']?.owner?.fcm_token ?? null;

    if (ownerFcmToken) {
      // Send FCM notification via edge function
      await this.supabase.functions.invoke('send-notification', {
        body: {
          token: ownerFcmToken,
          title: 'Incidente Detectado en tu Auto',
          body: 'Se detectó un posible accidente. Revisa los detalles.',
          data: { incident_id: incidentId }
        }
      });
    }
  }
}
