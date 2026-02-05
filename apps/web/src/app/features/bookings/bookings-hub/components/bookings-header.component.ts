import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { BookingRole } from '../bookings-hub.types';

@Component({
  selector: 'app-bookings-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-slate-100">
      <div class="px-4 pt-14 pb-4 max-w-2xl mx-auto space-y-4">
        <!-- Title -->
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Reservas</h1>

        <!-- Role Switcher -->
        <div class="flex bg-slate-100 rounded-xl p-1 max-w-xs">
          <button
            (click)="onRoleChange('renter')"
            [class]="role() === 'renter'
              ? 'flex-1 py-2 text-sm font-semibold text-slate-900 bg-white rounded-lg shadow-sm transition-all'
              : 'flex-1 py-2 text-sm font-medium text-slate-500 rounded-lg transition-all'"
          >
            Arrendatario
          </button>
          <button
            (click)="onRoleChange('owner')"
            [class]="role() === 'owner'
              ? 'flex-1 py-2 text-sm font-semibold text-slate-900 bg-white rounded-lg shadow-sm transition-all'
              : 'flex-1 py-2 text-sm font-medium text-slate-500 rounded-lg transition-all'"
          >
            Propietario
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
