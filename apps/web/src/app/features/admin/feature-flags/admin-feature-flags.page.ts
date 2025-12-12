import { CommonModule } from '@angular/common';
import {Component, computed, inject, OnInit, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService, PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import {
  CreateFeatureFlagDto,
  FeatureFlag,
  FeatureFlagAuditLog,
} from '../../../core/models/feature-flag.model';
import { FeatureFlagService } from '../../../core/services/feature-flag.service';

@Component({
  selector: 'app-admin-feature-flags',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    DialogModule,
    InputNumberModule,
    ToggleSwitchModule,
    InputTextModule,
    TableModule,
    TagModule,
    ToastModule,
    PrimeTemplate,
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>

    <div class="p-4">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Feature Flags</h1>
        <p-button label="Nueva Flag" icon="pi pi-plus" (onClick)="showCreateDialog()"></p-button>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <p-card>
          <div class="text-center">
            <div class="text-2xl md:text-3xl font-bold text-blue-500">{{ totalFlags() }}</div>
            <div class="text-gray-500 text-sm md:text-base">Total</div>
          </div>
        </p-card>
        <p-card>
          <div class="text-center">
            <div class="text-2xl md:text-3xl font-bold text-green-500">{{ enabledFlags() }}</div>
            <div class="text-gray-500 text-sm md:text-base">Habilitadas</div>
          </div>
        </p-card>
        <p-card>
          <div class="text-center">
            <div class="text-2xl md:text-3xl font-bold text-red-500">{{ disabledFlags() }}</div>
            <div class="text-gray-500 text-sm md:text-base">Deshabilitadas</div>
          </div>
        </p-card>
        <p-card>
          <div class="text-center">
            <div class="text-2xl md:text-3xl font-bold text-orange-500">
              {{ partialRolloutFlags() }}
            </div>
            <div class="text-gray-500 text-sm md:text-base">Parcial</div>
          </div>
        </p-card>
      </div>

      <!-- Desktop: Table View -->
      <p-card header="Feature Flags" class="hidden md:block">
        <p-table
          [value]="flags()"
          [loading]="loading()"
          styleClass="p-datatable-sm p-datatable-striped"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>Rollout %</th>
              <th>Actualizado</th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-flag>
            <tr>
              <td>
                <span class="font-mono text-sm">{{ flag.name }}</span>
              </td>
              <td>{{ flag.description || '-' }}</td>
              <td>
                <p-toggleswitch
                  [(ngModel)]="flag.enabled"
                  (onChange)="toggleFlag(flag)"
                ></p-toggleswitch>
              </td>
              <td>
                <p-tag
                  [value]="flag.rollout_percentage + '%'"
                  [severity]="getRolloutSeverity(flag.rollout_percentage)"
                ></p-tag>
              </td>
              <td>{{ flag.updated_at | date: 'short' }}</td>
              <td>
                <p-button
                  icon="pi pi-pencil"
                  [rounded]="true"
                  [text]="true"
                  (onClick)="editFlag(flag)"
                ></p-button>
                <p-button
                  icon="pi pi-trash"
                  [rounded]="true"
                  [text]="true"
                  severity="danger"
                  (onClick)="confirmDelete(flag)"
                ></p-button>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" class="text-center py-4">No hay feature flags configuradas</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <!-- Mobile: Card View -->
      <div class="md:hidden space-y-3">
        <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-500">Feature Flags</h2>

        @if (loading()) {
          <div class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        } @else if (flags().length === 0) {
          <div class="text-center py-8 text-gray-500">
            No hay feature flags configuradas
          </div>
        } @else {
          @for (flag of flags(); track flag.id) {
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-4">
              <!-- Header: Name + Toggle -->
              <div class="flex items-center justify-between mb-3">
                <span class="font-mono text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[60%]">
                  {{ flag.name }}
                </span>
                <p-toggleswitch
                  [(ngModel)]="flag.enabled"
                  (onChange)="toggleFlag(flag)"
                ></p-toggleswitch>
              </div>

              <!-- Description -->
              @if (flag.description) {
                <p class="text-sm text-gray-600 dark:text-gray-500 mb-3 line-clamp-2">
                  {{ flag.description }}
                </p>
              }

              <!-- Meta row -->
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  <p-tag
                    [value]="flag.rollout_percentage + '%'"
                    [severity]="getRolloutSeverity(flag.rollout_percentage)"
                  ></p-tag>
                  <span class="text-gray-500 text-xs">
                    {{ flag.updated_at | date: 'shortDate' }}
                  </span>
                </div>

                <!-- Actions -->
                <div class="flex gap-1">
                  <button
                    class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    (click)="editFlag(flag)"
                    aria-label="Editar"
                  >
                    <svg class="w-5 h-5 text-gray-600 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    class="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    (click)="confirmDelete(flag)"
                    aria-label="Eliminar"
                  >
                    <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          }
        }
      </div>

      <!-- Audit Log - Desktop Table -->
      <p-card header="Historial de Cambios" class="mt-4 hidden md:block">
        <p-table
          [value]="auditLog()"
          [loading]="loadingAudit()"
          styleClass="p-datatable-sm"
          [paginator]="true"
          [rows]="5"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>Fecha</th>
              <th>Flag</th>
              <th>Acción</th>
              <th>Cambios</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-log>
            <tr>
              <td>{{ log.changed_at | date: 'medium' }}</td>
              <td>
                <span class="font-mono text-sm">{{ log.feature_flag_name }}</span>
              </td>
              <td>
                <p-tag [value]="log.action" [severity]="getActionSeverity(log.action)"></p-tag>
              </td>
              <td>
                @if (log.action === 'updated' && log.old_value && log.new_value) {
                  @if (log.old_value.enabled !== log.new_value.enabled) {
                    <span class="text-sm">
                      enabled: {{ log.old_value.enabled }} →
                      {{ log.new_value.enabled }}
                    </span>
                  }
                  @if (log.old_value.rollout_percentage !== log.new_value.rollout_percentage) {
                    <span class="text-sm">
                      rollout: {{ log.old_value.rollout_percentage }}% →
                      {{ log.new_value.rollout_percentage }}%
                    </span>
                  }
                }
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <!-- Audit Log - Mobile Cards -->
      <div class="mt-4 md:hidden">
        <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-500 mb-3">Historial de Cambios</h2>

        @if (loadingAudit()) {
          <div class="flex justify-center py-4">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        } @else {
          <div class="space-y-2">
            @for (log of auditLog().slice(0, 5); track log.id) {
              <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-3">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-mono text-xs text-gray-900 dark:text-gray-100">
                    {{ log.feature_flag_name }}
                  </span>
                  <p-tag [value]="log.action" [severity]="getActionSeverity(log.action)" styleClass="text-xs"></p-tag>
                </div>
                <div class="text-xs text-gray-500">
                  {{ log.changed_at | date: 'short' }}
                </div>
                @if (log.action === 'updated' && log.old_value && log.new_value) {
                  <div class="mt-1 text-xs text-gray-600 dark:text-gray-500">
                    @if (log.old_value.enabled !== log.new_value.enabled) {
                      enabled: {{ log.old_value.enabled }} → {{ log.new_value.enabled }}
                    }
                    @if (log.old_value.rollout_percentage !== log.new_value.rollout_percentage) {
                      rollout: {{ log.old_value.rollout_percentage }}% → {{ log.new_value.rollout_percentage }}%
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- Create / Edit Dialog -->
    <p-dialog
      [(visible)]="dialogVisible"
      [header]="editingFlag() ? 'Editar Feature Flag' : 'Nueva Feature Flag'"
      [modal]="true"
      [style]="{ width: '500px' }"
    >
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">Nombre</label>
          <input
            pInputText
            [(ngModel)]="formData.name"
            [disabled]="!!editingFlag()"
            class="w-full"
            placeholder="feature_name"
          />
          <small class="text-gray-500">Usar snake_case, ej: new_booking_flow</small>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Descripción</label>
          <input
            pInputText
            [(ngModel)]="formData.description"
            class="w-full"
            placeholder="Descripción de la feature"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Habilitada</label>
          <p-toggleswitch [(ngModel)]="formData.enabled"></p-toggleswitch>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Rollout Percentage</label>
          <p-inputNumber
            [(ngModel)]="formData.rollout_percentage"
            [min]="0"
            [max]="100"
            suffix="%"
            class="w-full"
          ></p-inputNumber>
          <small class="text-gray-500">
            Porcentaje de usuarios que verán la feature (0-100%)
          </small>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancelar" [text]="true" (onClick)="dialogVisible = false"></p-button>
        <p-button
          [label]="editingFlag() ? 'Guardar' : 'Crear'"
          (onClick)="saveFlag()"
          [loading]="saving()"
        ></p-button>
      </ng-template>
    </p-dialog>

    <!-- Delete Confirmation Dialog -->
    <p-dialog
      [(visible)]="deleteDialogVisible"
      header="Confirmar Eliminación"
      [modal]="true"
      [style]="{ width: '400px' }"
    >
      <p>
        ¿Estás seguro de eliminar la flag
        <strong class="font-mono">{{ flagToDelete()?.name }}</strong
        >?
      </p>
      <p class="text-sm text-red-500 mt-2">Esta acción no se puede deshacer.</p>

      <ng-template pTemplate="footer">
        <p-button label="Cancelar" [text]="true" (onClick)="deleteDialogVisible = false"></p-button>
        <p-button
          label="Eliminar"
          severity="danger"
          (onClick)="deleteFlag()"
          [loading]="deleting()"
        ></p-button>
      </ng-template>
    </p-dialog>
  `,
})
export class AdminFeatureFlagsPage implements OnInit {
  private readonly featureFlagService = inject(FeatureFlagService);
  private readonly messageService = inject(MessageService);

  // State
  readonly flags = this.featureFlagService.flags;
  readonly loading = this.featureFlagService.loading;
  readonly auditLog = signal<FeatureFlagAuditLog[]>([]);
  readonly loadingAudit = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly editingFlag = signal<FeatureFlag | null>(null);
  readonly flagToDelete = signal<FeatureFlag | null>(null);

  // Computed stats
  readonly totalFlags = computed(() => this.flags().length);
  readonly enabledFlags = computed(() => this.flags().filter((f) => f.enabled).length);
  readonly disabledFlags = computed(() => this.flags().filter((f) => !f.enabled).length);
  readonly partialRolloutFlags = computed(
    () => this.flags().filter((f) => f.enabled && f.rollout_percentage < 100).length,
  );

  // Dialog state
  dialogVisible = false;
  deleteDialogVisible = false;

  // Form data
  formData: CreateFeatureFlagDto = {
    name: '',
    description: '',
    enabled: false,
    rollout_percentage: 100,
  };

  async ngOnInit(): Promise<void> {
    await this.loadAuditLog();
  }

  async loadAuditLog(): Promise<void> {
    this.loadingAudit.set(true);
    try {
      const logs = await this.featureFlagService.getAuditLog(50);
      this.auditLog.set(logs);
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo cargar el historial',
      });
    } finally {
      this.loadingAudit.set(false);
    }
  }

  showCreateDialog(): void {
    this.editingFlag.set(null);
    this.formData = {
      name: '',
      description: '',
      enabled: false,
      rollout_percentage: 100,
    };
    this.dialogVisible = true;
  }

  editFlag(flag: FeatureFlag): void {
    this.editingFlag.set(flag);
    this.formData = {
      name: flag.name,
      description: flag.description || '',
      enabled: flag.enabled,
      rollout_percentage: flag.rollout_percentage,
    };
    this.dialogVisible = true;
  }

  async saveFlag(): Promise<void> {
    if (!this.formData.name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'El nombre es requerido',
      });
      return;
    }

    this.saving.set(true);
    try {
      const editing = this.editingFlag();
      if (editing) {
        await this.featureFlagService.updateFlag(editing.id, {
          description: this.formData.description,
          enabled: this.formData.enabled,
          rollout_percentage: this.formData.rollout_percentage,
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Guardado',
          detail: 'Feature flag actualizada',
        });
      } else {
        await this.featureFlagService.createFlag(this.formData);
        this.messageService.add({
          severity: 'success',
          summary: 'Creada',
          detail: 'Feature flag creada exitosamente',
        });
      }
      this.dialogVisible = false;
      await this.loadAuditLog();
    } catch (err) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: err instanceof Error ? err.message : 'Error al guardar',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async toggleFlag(flag: FeatureFlag): Promise<void> {
    try {
      await this.featureFlagService.toggleFlag(flag.id, flag.enabled);
      this.messageService.add({
        severity: 'success',
        summary: 'Actualizado',
        detail: `${flag.name} ${flag.enabled ? 'habilitada' : 'deshabilitada'}`,
      });
      await this.loadAuditLog();
    } catch {
      // Revert the toggle
      flag.enabled = !flag.enabled;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar la flag',
      });
    }
  }

  confirmDelete(flag: FeatureFlag): void {
    this.flagToDelete.set(flag);
    this.deleteDialogVisible = true;
  }

  async deleteFlag(): Promise<void> {
    const flag = this.flagToDelete();
    if (!flag) return;

    this.deleting.set(true);
    try {
      await this.featureFlagService.deleteFlag(flag.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Eliminada',
        detail: `Feature flag ${flag.name} eliminada`,
      });
      this.deleteDialogVisible = false;
      await this.loadAuditLog();
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo eliminar la flag',
      });
    } finally {
      this.deleting.set(false);
    }
  }

  getRolloutSeverity(percentage: number): 'success' | 'info' | 'warn' | 'danger' {
    if (percentage === 100) return 'success';
    if (percentage >= 50) return 'info';
    if (percentage > 0) return 'warn';
    return 'danger';
  }

  getActionSeverity(action: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (action) {
      case 'created':
        return 'success';
      case 'updated':
        return 'info';
      case 'deleted':
        return 'danger';
      default:
        return 'info';
    }
  }
}
