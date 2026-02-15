import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { BookingRole } from '@core/services/bookings/booking-ui.service';
import { Booking } from '@core/models';
import { BookingsListComponent } from './bookings-list.component';

@Component({
  selector: 'app-bookings-operational-dashboard',
  standalone: true,
  imports: [RouterLink, IonIcon, BookingsListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-in fade-in zoom-in duration-500 space-y-6">
      <!-- 1. IDENTITY & STATUS CARD -->
      <div
        class="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm relative overflow-hidden"
      >
        <div class="absolute top-0 right-0 p-4 opacity-10">
          <ion-icon name="shield-checkmark-outline" class="text-6xl text-slate-900"></ion-icon>
        </div>

        <div class="flex items-center gap-4 mb-6 relative z-10">
          <div
            class="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"
          >
            <ion-icon name="person-outline" class="text-xl"></ion-icon>
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900">
              {{ role() === 'owner' ? 'Cuenta Propietario' : 'Cuenta Conductor' }}
            </h3>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span class="text-xs font-semibold text-emerald-600">Sistema Operativo Activo</span>
            </div>
          </div>
        </div>

        <!-- Status Grid -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span class="block text-[10px] uppercase font-bold text-slate-400 mb-1"
              >Verificación</span
            >
            <div class="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
              <ion-icon name="checkmark-circle" class="text-emerald-500"></ion-icon>
              Nivel 2 Aprobado
            </div>
          </div>
          <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span class="block text-[10px] uppercase font-bold text-slate-400 mb-1"
              >Reputación</span
            >
            <div class="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
              <ion-icon name="star" class="text-amber-400"></ion-icon>
              Sin reviews aún
            </div>
          </div>
        </div>
      </div>

      <!-- 2. TRIP SLOT / FLEET SLOT -->
      <div
        class="relative group cursor-pointer"
        [routerLink]="role() === 'owner' ? '/cars/publish' : '/cars/list'"
      >
        <!-- Tech borders -->
        <div
          class="absolute inset-0 rounded-3xl border-2 border-dashed border-slate-200 group-hover:border-slate-300 transition-colors"
        ></div>

        <div
          class="p-6 min-h-[140px] flex flex-col items-center justify-center text-center relative z-10"
        >
          <div
            class="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300"
          >
            <ion-icon
              [name]="role() === 'owner' ? 'add-outline' : 'navigate-outline'"
              class="text-2xl text-slate-400"
            ></ion-icon>
          </div>

          <h4 class="text-sm font-bold text-slate-900 mb-1">
            {{ role() === 'owner' ? 'Slot de Flota Disponible' : 'Slot de Viaje Disponible' }}
          </h4>
          <p class="text-xs text-slate-400 max-w-[200px] mb-4">
            {{
              role() === 'owner'
                ? 'Listo para sincronizar nuevo vehículo.'
                : 'Configuración de viaje lista para asignar.'
            }}
          </p>

          <span
            class="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg group-hover:bg-indigo-100 transition-colors"
          >
            {{ role() === 'owner' ? '+ Agregar Unidad' : '+ Iniciar Configuración' }}
          </span>
        </div>
      </div>

      <!-- 3. FINANCIAL & LEGAL PULSE -->
      <div class="grid grid-cols-2 gap-4">
        <!-- Legal -->
        <div class="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div class="flex items-center gap-2 mb-2">
            <ion-icon name="document-text-outline" class="text-slate-400"></ion-icon>
            <span class="text-xs font-bold text-slate-500">Contratos</span>
          </div>
          <p class="text-xs text-slate-400">Sin firmas pendientes</p>
        </div>

        <!-- Financial -->
        <div class="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div class="flex items-center gap-2 mb-2">
            <ion-icon name="wallet-outline" class="text-slate-400"></ion-icon>
            <span class="text-xs font-bold text-slate-500">Reembolsos</span>
          </div>
          <p class="text-xs text-slate-400">0 en proceso</p>
        </div>
      </div>

      <!-- HISTORY LIST (If exists) -->
      @if (historyBookings().length > 0) {
        <div class="pt-4 border-t border-slate-100">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">
            Historial Operativo
          </h3>
          <app-bookings-list [bookings]="historyBookings()" [role]="role()"></app-bookings-list>
        </div>
      }
    </div>
  `,
})
export class BookingsOperationalDashboardComponent {
  role = input.required<BookingRole>();
  historyBookings = input.required<Booking[]>();
}
