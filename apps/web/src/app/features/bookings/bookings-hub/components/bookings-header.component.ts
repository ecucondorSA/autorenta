import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { PressScaleDirective } from '@shared/directives/press-scale.directive';
import { BookingRole } from '../bookings-hub.types';

@Component({
  selector: 'app-bookings-header',
  standalone: true,
  imports: [CommonModule, IonIcon, PressScaleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-30 bg-surface-base/80 backdrop-blur-xl border-b border-border-muted px-4 py-4 sm:px-6">
      <div class="container-page flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-premium-sm">
              <ion-icon name="person-outline"></ion-icon>
            </div>
            <div>
              <h1 class="text-xl font-bold text-text-primary tracking-tight font-sans">
                Hola, {{ userName() }}
              </h1>
              <p class="text-[10px] uppercase font-black tracking-widest text-text-muted">
                {{ roleLabel() }} · {{ todayLabel() }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button appPressScale class="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center text-text-secondary relative">
              <ion-icon name="notifications-outline"></ion-icon>
              <span class="absolute top-2.5 right-2.5 w-2 h-2 bg-cta-default rounded-full ring-2 ring-surface-base"></span>
            </button>
          </div>
        </div>

        <!-- ROLE SWITCHER (Segmented Control) -->
        <div class="p-1 bg-surface-secondary rounded-2xl flex items-center shadow-inner max-w-sm">
          <button
            (click)="onRoleChange('renter')"
            [class.bg-white]="role() === 'renter'"
            [class.shadow-premium-sm]="role() === 'renter'"
            [class.text-text-primary]="role() === 'renter'"
            class="flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all duration-300 text-text-muted"
          >
            Arrendatario
          </button>
          <button
            (click)="onRoleChange('owner')"
            [class.bg-white]="role() === 'owner'"
            [class.shadow-premium-sm]="role() === 'owner'"
            [class.text-text-primary]="role() === 'owner'"
            class="flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all duration-300 text-text-muted"
          >
            Propietario
          </button>
        </div>
      </div>
    </header>
  `
})
export class BookingsHeaderComponent {
  userName = input.required<string>();
  role = input.required<BookingRole>();
  roleChange = output<BookingRole>();

  readonly todayLabel = computed(() => {
    const now = new Date();
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).format(now);
  });

  readonly roleLabel = computed(() =>
    this.role() === 'owner' ? 'Modo propietario' : 'Modo arrendatario',
  );

  onRoleChange(newRole: BookingRole) {
    if (this.role() !== newRole) {
      this.roleChange.emit(newRole);
    }
  }
}
