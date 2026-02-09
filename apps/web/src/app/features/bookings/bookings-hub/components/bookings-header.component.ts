import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { BookingRole } from '../bookings-hub.types';

@Component({
  selector: 'app-bookings-header',
  standalone: true,
  imports: [RouterLink, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="relative overflow-hidden">
      <!-- Gradient Background -->
      <div class="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.15),transparent_60%)]"></div>
      <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"></div>

      <div class="relative px-4 pt-14 pb-6 max-w-2xl mx-auto">
        <!-- Top Row: Title + Action -->
        <div class="flex items-center justify-between mb-5">
          <div>
            <p class="text-indigo-300/80 text-xs font-semibold tracking-widest uppercase mb-1">Mi Panel</p>
            <h1 class="text-2xl font-bold text-white tracking-tight">Reservas</h1>
          </div>
          <a
            [routerLink]="role() === 'owner' ? '/cars/publish' : '/marketplace'"
            class="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 backdrop-blur-sm
                   text-white text-sm font-medium rounded-xl border border-white/10
                   hover:bg-white/15 active:scale-95 transition-all"
          >
            <ion-icon [name]="role() === 'owner' ? 'add-outline' : 'search-outline'" class="text-base"></ion-icon>
            {{ role() === 'owner' ? 'Publicar' : 'Explorar' }}
          </a>
        </div>

        <!-- Role Switcher — Premium Segmented Control -->
        <div class="relative flex bg-white/[0.07] backdrop-blur-sm rounded-2xl p-1 border border-white/[0.08]">
          <!-- Sliding Indicator -->
          <div
            class="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-white/[0.15] backdrop-blur-md shadow-lg
                   transition-transform duration-300 ease-out border border-white/10"
            [class.translate-x-0]="role() === 'renter'"
            [class.translate-x-full]="role() === 'owner'"
          ></div>

          <button
            (click)="onRoleChange('renter')"
            class="relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200"
            [class]="role() === 'renter'
              ? 'text-white font-semibold'
              : 'text-slate-400 font-medium hover:text-slate-300'"
          >
            <ion-icon name="person-outline" class="text-base"></ion-icon>
            <span class="text-sm">Viajero</span>
          </button>

          <button
            (click)="onRoleChange('owner')"
            class="relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200"
            [class]="role() === 'owner'
              ? 'text-white font-semibold'
              : 'text-slate-400 font-medium hover:text-slate-300'"
          >
            <ion-icon name="key-outline" class="text-base"></ion-icon>
            <span class="text-sm">Propietario</span>
          </button>
        </div>
      </div>
    </header>
  `,
})
export class BookingsHeaderComponent {
  role = input.required<BookingRole>();
  roleChange = output<BookingRole>();

  onRoleChange(newRole: BookingRole): void {
    if (this.role() !== newRole) {
      this.roleChange.emit(newRole);
    }
  }
}
