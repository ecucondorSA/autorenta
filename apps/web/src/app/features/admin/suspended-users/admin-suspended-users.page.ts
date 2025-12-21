import {Component, OnInit, inject, signal, computed,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '@core/services/admin/admin.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';

interface SuspendedUser {
  id: string;
  email: string;
  full_name: string;
  wallet_balance: number;
  debt_start_date: string;
  days_in_debt: number;
  suspended_at: string | null;
  suspension_reason: string | null;
}

@Component({
  selector: 'app-admin-suspended-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-text-primary dark:text-text-inverse">
          Usuarios Suspendidos
        </h1>
        <p class="text-text-secondary mt-1">
          Gestiona cuentas suspendidas por deuda u otras razones
        </p>
      </div>
    
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="card-premium p-4">
          <p class="text-sm text-text-muted">Total Suspendidos</p>
          <p class="text-2xl font-bold text-error-strong">{{ suspendedUsers().length }}</p>
        </div>
        <div class="card-premium p-4">
          <p class="text-sm text-text-muted">Deuda Total</p>
          <p class="text-2xl font-bold text-error-strong">
            {{ totalDebt() | currency:'USD':'symbol':'1.0-0' }}
          </p>
        </div>
        <div class="card-premium p-4">
          <p class="text-sm text-text-muted">Con Warning (+20 días)</p>
          <p class="text-2xl font-bold text-warning-strong">{{ warningUsers().length }}</p>
        </div>
        <div class="card-premium p-4">
          <p class="text-sm text-text-muted">Próximos a Suspender</p>
          <p class="text-2xl font-bold text-cta-default">{{ nearSuspensionUsers().length }}</p>
        </div>
      </div>
    
      <!-- Filters -->
      <div class="card-premium p-4 mb-6">
        <div class="flex flex-wrap gap-4 items-center">
          <div>
            <label class="text-sm text-text-muted mb-1 block">Filtrar por estado</label>
            <select
              [(ngModel)]="filterStatus"
              (ngModelChange)="loadUsers()"
              class="input-field"
              >
              <option value="suspended">Solo Suspendidos</option>
              <option value="warning">Con Warning</option>
              <option value="all">Todos con Deuda</option>
            </select>
          </div>
          <div class="flex-1"></div>
          <button
            (click)="loadUsers()"
            class="btn-secondary"
            [disabled]="loading()"
            >
            @if (loading()) {
              <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            }
            Actualizar
          </button>
        </div>
      </div>
    
      <!-- Loading -->
      @if (loading()) {
        <div class="text-center py-12">
          <div class="inline-block h-10 w-10 animate-spin rounded-full border-4 border-border-muted border-t-cta-default"></div>
          <p class="text-text-secondary mt-4">Cargando usuarios...</p>
        </div>
      }
    
      <!-- Users Table -->
      @else if (filteredUsers().length > 0) {
      <div class="card-premium overflow-hidden">
        <table class="w-full">
          <thead class="bg-surface-secondary dark:bg-surface-raised">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Usuario</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Deuda</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Días en Deuda</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Estado</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Razón</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-default dark:divide-slate-deep">
            @for (user of filteredUsers(); track user.id) {
              <tr class="hover:bg-surface-secondary/50 dark:hover:bg-surface-raised/50">
                <td class="px-4 py-4">
                  <div>
                    <p class="font-medium text-text-primary dark:text-text-inverse">{{ user.full_name }}</p>
                    <p class="text-sm text-text-muted">{{ user.email }}</p>
                  </div>
                </td>
                <td class="px-4 py-4">
                  <span class="font-semibold text-error-strong">
                    {{ (user.wallet_balance / 100) | currency:'USD':'symbol':'1.2-2' }}
                  </span>
                </td>
                <td class="px-4 py-4">
                  <span
                    class="px-2 py-1 rounded-full text-xs font-medium"
                      [ngClass]="{
                        'bg-error-bg text-error-strong': user.days_in_debt >= 30,
                        'bg-warning-bg text-warning-strong': user.days_in_debt >= 20 && user.days_in_debt < 30,
                        'bg-surface-secondary text-text-secondary': user.days_in_debt < 20
                      }"
                    >
                    {{ user.days_in_debt }} días
                  </span>
                </td>
                <td class="px-4 py-4">
                  @if (user.suspended_at) {
                    <span class="px-2 py-1 rounded-full text-xs font-medium bg-error-bg text-error-strong">
                      Suspendido
                    </span>
                  } @else if (user.days_in_debt >= 20) {
                    <span class="px-2 py-1 rounded-full text-xs font-medium bg-warning-bg text-warning-strong">
                      Warning
                    </span>
                  } @else {
                    <span class="px-2 py-1 rounded-full text-xs font-medium bg-surface-secondary text-text-secondary">
                      En deuda
                    </span>
                  }
                </td>
                <td class="px-4 py-4 max-w-xs truncate text-sm text-text-secondary">
                  {{ user.suspension_reason || '-' }}
                </td>
                <td class="px-4 py-4 text-right">
                  @if (user.suspended_at) {
                    <button
                      (click)="unsuspendUser(user)"
                      class="text-sm text-success-strong hover:text-success-700 font-medium"
                      [disabled]="user.wallet_balance < 0"
                      [title]="user.wallet_balance < 0 ? 'Usuario debe pagar su deuda primero' : 'Reactivar cuenta'"
                      >
                      Reactivar
                    </button>
                  } @else {
                    <button
                      (click)="viewUserDetails(user)"
                      class="text-sm text-cta-default hover:text-cta-hover font-medium"
                      >
                      Ver detalles
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    
    @else {
    <div class="card-premium p-12 text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-success-bg flex items-center justify-center">
        <svg class="w-8 h-8 text-success-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-text-primary dark:text-text-inverse mb-2">
        No hay usuarios suspendidos
      </h3>
      <p class="text-text-secondary">
        Todos los usuarios están al día con sus pagos.
      </p>
    </div>
    }
    </div>
    `
})
export class AdminSuspendedUsersPage implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(NotificationManagerService);

  readonly loading = signal(true);
  readonly suspendedUsers = signal<SuspendedUser[]>([]);
  readonly warningUsers = signal<SuspendedUser[]>([]);
  readonly nearSuspensionUsers = signal<SuspendedUser[]>([]);
  readonly totalUsers = signal(0);

  filterStatus = 'suspended';

  readonly filteredUsers = computed(() => {
    const all = [...this.suspendedUsers(), ...this.warningUsers()];
    switch (this.filterStatus) {
      case 'suspended': return this.suspendedUsers();
      case 'warning': return this.warningUsers();
      default: return all;
    }
  });

  readonly totalDebt = computed(() => {
    const all = [...this.suspendedUsers(), ...this.warningUsers()];
    return all.reduce((sum, u) => sum + Math.abs(u.wallet_balance) / 100, 0);
  });

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading.set(true);
    try {
      // Use AdminService RPC to get users with debt
      const result = await this.adminService.getUsersWithDebt({
        minDays: 0,
        limit: 100,
      });

      this.totalUsers.set(result.total);

      // Map to our interface and categorize
      const allUsers: SuspendedUser[] = result.users.map(u => ({
        id: u.userId,
        email: u.email,
        full_name: u.fullName,
        wallet_balance: u.balanceCents,
        debt_start_date: u.debtStartDate,
        days_in_debt: u.daysSinceDebt,
        suspended_at: u.suspendedAt,
        suspension_reason: u.suspensionReason,
      }));

      // Categorize users
      const suspended = allUsers.filter(u => u.suspended_at !== null);
      const warning = allUsers.filter(u => u.suspended_at === null && u.days_in_debt >= 20);
      const nearSuspension = allUsers.filter(u => u.suspended_at === null && u.days_in_debt >= 15 && u.days_in_debt < 20);

      this.suspendedUsers.set(suspended);
      this.warningUsers.set(warning);
      this.nearSuspensionUsers.set(nearSuspension);

    } catch (err) {
      console.error('Error loading suspended users:', err);
      this.toast.error('Error', 'No se pudieron cargar los usuarios');
    } finally {
      this.loading.set(false);
    }
  }

  async unsuspendUser(user: SuspendedUser): Promise<void> {
    if (user.wallet_balance < 0) {
      this.toast.warning('No se puede reactivar', 'El usuario debe pagar su deuda primero');
      return;
    }

    if (!confirm(`¿Estás seguro de reactivar la cuenta de ${user.full_name}?`)) return;

    try {
      const result = await this.adminService.unsuspendAccount(user.id);

      if (!result.success) {
        throw new Error(result.error || 'Error desconocido');
      }

      this.toast.success('Cuenta reactivada', `La cuenta de ${user.full_name} ha sido reactivada`);
      await this.loadUsers();
    } catch (err) {
      console.error('Error unsuspending user:', err);
      this.toast.error('Error', err instanceof Error ? err.message : 'No se pudo reactivar la cuenta');
    }
  }

  async suspendUser(user: SuspendedUser): Promise<void> {
    const reason = prompt('Motivo de la suspensión:', 'Deuda prolongada sin pagar');
    if (!reason) return;

    try {
      const result = await this.adminService.suspendAccountForDebt(user.id, reason);

      if (!result.success) {
        throw new Error(result.error || 'Error desconocido');
      }

      this.toast.success('Cuenta suspendida', `La cuenta de ${user.full_name} ha sido suspendida`);
      await this.loadUsers();
    } catch (err) {
      console.error('Error suspending user:', err);
      this.toast.error('Error', err instanceof Error ? err.message : 'No se pudo suspender la cuenta');
    }
  }

  viewUserDetails(user: SuspendedUser): void {
    alert(`Usuario: ${user.full_name}\nEmail: ${user.email}\nDeuda: $${Math.abs(user.wallet_balance / 100).toFixed(2)}\nDías en deuda: ${user.days_in_debt}\nSuspendido: ${user.suspended_at ? 'Sí' : 'No'}\nRazón: ${user.suspension_reason || 'N/A'}`);
  }
}
