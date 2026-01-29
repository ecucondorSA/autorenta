import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Booking } from '@core/models';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  carOutline,
  idCardOutline,
  locationOutline,
  warningOutline,
} from 'ionicons/icons';

/**
 * BookingCheckInInfoCardComponent
 *
 * Displays critical check-in information for a confirmed booking:
 * - Date and time of pickup
 * - Meeting point with navigation links (Google Maps, Waze)
 * - Required physical documents reminder
 * - Car ready status indicator
 *
 * Only shown when booking status is 'confirmed' or 'in_progress'.
 */
@Component({
  selector: 'app-booking-check-in-info-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonIcon],
  template: `
    @if (shouldShow()) {
      <section class="bg-neutral-900 text-white rounded-2xl shadow-xl overflow-hidden">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-neutral-700 flex justify-between items-center">
          <h3 class="text-base font-bold flex items-center gap-2 text-white">
            <ion-icon name="location" class="text-xl"></ion-icon>
            Información de Check-in
          </h3>
          <!-- Car Ready Status -->
          <div class="flex items-center gap-2">
            @if (awaitingRenterCheckIn()) {
              @if (isOwner()) {
                <!-- Owner: ya entregó, esperando viajero -->
                <span
                  class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold"
                >
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Auto Entregado
                </span>
              } @else {
                <!-- Renter: debe confirmar recepción -->
                <span
                  class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold"
                >
                  <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  Confirmar Recepción
                </span>
              }
            } @else if (booking().owner_confirmed_delivery) {
              <span
                class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold"
              >
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Auto Listo
              </span>
            } @else {
              <span
                class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold"
              >
                <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                Preparando
              </span>
            }
          </div>
        </div>

        <div class="p-5 space-y-5">
          <!-- Fecha y Hora Prominente -->
          <div class="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs text-neutral-300 font-semibold uppercase tracking-wider mb-1">
                  Fecha y Hora de Retiro
                </p>
                <p class="text-2xl font-bold text-white">
                  {{ booking().start_at | date: 'EEEE d MMMM' }}
                </p>
                <p class="text-3xl font-black tracking-tight text-white">
                  {{ booking().start_at | date: 'HH:mm' }} hs
                </p>
              </div>
              <div class="text-right">
                <ion-icon name="calendar" class="text-5xl text-white/30"></ion-icon>
              </div>
            </div>
          </div>

          <!-- Coordenadas con Navegación -->
          <div class="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
            <p class="text-xs text-neutral-300 font-semibold uppercase tracking-wider mb-3">
              Punto de Encuentro
            </p>

            @if (hasPickupLocation()) {
              <!-- Usar coordenadas específicas del pickup -->
              <p class="text-sm font-medium mb-4 text-white">
                {{ booking().pickup_location_lat?.toFixed(6) }},
                {{ booking().pickup_location_lng?.toFixed(6) }}
              </p>

              <div class="flex gap-3">
                <a
                  [href]="googleMapsUrl()"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-neutral-900 font-bold text-sm hover:bg-neutral-100 transition-all active:scale-[0.98] shadow-lg"
                >
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                    />
                  </svg>
                  Google Maps
                </a>
                <a
                  [href]="wazeUrl()"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-400 text-neutral-900 font-bold text-sm hover:bg-sky-300 transition-all active:scale-[0.98] shadow-lg"
                >
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M20.54 6.63c.69 2.24.46 4.27-.46 6.13-.67 1.36-1.62 2.49-2.82 3.42-.43.33-.88.63-1.36.89.05.58.01 1.16-.12 1.73-.18.78-.53 1.5-1.03 2.13-.37.47-.81.88-1.31 1.22-.1.07-.22.07-.32 0-.1-.07-.14-.19-.1-.3.22-.57.35-1.18.38-1.79-1.27.24-2.59.18-3.84-.19-1.72-.51-3.17-1.51-4.28-2.93-.98-1.25-1.59-2.68-1.8-4.27-.14-1.1-.08-2.19.19-3.26.34-1.35.96-2.56 1.84-3.61 1.1-1.31 2.47-2.29 4.09-2.89 1.35-.5 2.76-.68 4.2-.53 1.56.16 2.99.66 4.27 1.51 1.2.79 2.18 1.81 2.93 3.02.18.29.33.59.54.99zM12 9c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-4 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm8 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"
                    />
                  </svg>
                  Waze
                </a>
              </div>
            } @else {
              <div class="flex items-center gap-3 text-neutral-300">
                <ion-icon name="location-outline" class="text-2xl"></ion-icon>
                <span class="text-sm font-medium">Ubicación no disponible</span>
              </div>
            }
          </div>

          <!-- Documentos Físicos Requeridos (PROMINENTE) -->
          <div class="bg-amber-900/40 backdrop-blur rounded-xl p-4 border border-amber-500/40">
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center shrink-0"
              >
                <ion-icon name="warning" class="text-xl text-amber-400"></ion-icon>
              </div>
              <div>
                <p class="text-sm font-bold text-amber-300 mb-2">Documentos Físicos Obligatorios</p>
                <p class="text-xs text-neutral-200 mb-3">
                  Aunque la App verificó tu identidad, legalmente debes mostrar los documentos
                  físicos al dueño.
                </p>
                <div class="grid grid-cols-2 gap-2">
                  <div class="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2">
                    <ion-icon name="id-card" class="text-amber-400"></ion-icon>
                    <span class="text-xs font-semibold text-white">DNI Físico</span>
                  </div>
                  <div class="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2">
                    <ion-icon name="car" class="text-amber-400"></ion-icon>
                    <span class="text-xs font-semibold text-white">Carnet Físico</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    }
  `,
})
export class BookingCheckInInfoCardComponent {
  readonly booking = input.required<Booking>();
  readonly awaitingRenterCheckIn = input<boolean>(false);
  readonly isOwner = input<boolean>(false);

  constructor() {
    addIcons({
      calendarOutline,
      locationOutline,
      warningOutline,
      idCardOutline,
      carOutline,
    });
  }

  readonly shouldShow = computed(() => {
    const status = this.booking().status;
    return status === 'confirmed' || status === 'in_progress';
  });

  readonly hasPickupLocation = computed(() => {
    const b = this.booking();
    return b.pickup_location_lat != null && b.pickup_location_lng != null;
  });

  readonly googleMapsUrl = computed(() => {
    const b = this.booking();
    return `https://www.google.com/maps/dir/?api=1&destination=${b.pickup_location_lat},${b.pickup_location_lng}`;
  });

  readonly wazeUrl = computed(() => {
    const b = this.booking();
    return `https://waze.com/ul?ll=${b.pickup_location_lat},${b.pickup_location_lng}&navigate=yes`;
  });
}
