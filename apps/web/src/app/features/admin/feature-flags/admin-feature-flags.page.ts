import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService, PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
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
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    DialogModule,
    InputNumberModule,
    InputSwitchModule,
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
        <p-button
          label="Nueva Flag"
          icon="pi pi-plus"
          (onClick)="showCreateDialog()"
        ></p-button>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <p-card>
          <div class="text-center">
            <div class="text-3xl font-bold text-blue-500">{{ totalFlags() }}</div>
            <div class="text-gray-500">Total Flags</div>
          </div>
        </p-card>
        <p-card>
          <div class="text-center">
            <div class="text-3xl font-bold text-green-500">{{ enabledFlags() }}</div>
            <div class="text-gray-500">Habilitadas</div>
          </div>
        </p-card>
        <p-card>
          <div class="text-center">
            <div class="text-3xl font-bold text-red-500">{{ disabledFlags() }}</div>
            <div class="text-gray-500">Deshabilitadas</div>
          </div>
        </p-card>
        <p-card>
          <div class="text-center">
            <div class="text-3xl font-bold text-orange-500">
              {{ partialRolloutFlags() }}
            </div>
            <div class="text-gray-500">Rollout Parcial</div>
          </div>
        </p-card>
      </div>

      <!-- Flags Table -->
      <p-card header="Feature Flags">
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
                <p-inputSwitch
                  [(ngModel)]="flag.enabled"
                  (onChange)="toggleFlag(flag)"
                ></p-inputSwitch>
              </td>
              <td>
                <p-tag
                  [value]="flag.rollout_percentage + '%'"
                  [severity]="getRolloutSeverity(flag.rollout_percentage)"
                ></p-tag>
              </td>
              <td>{{ flag.updated_at | date : 'short' }}</td>
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
              <td colspan="6" class="text-center py-4">
                No hay feature flags configuradas
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <!-- Audit Log -->
      <p-card header="Historial de Cambios" class="mt-4">
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
              <td>{{ log.changed_at | date : 'medium' }}</td>
              <td>
                <span class="font-mono text-sm">{{ log.feature_flag_name }}</span>
              </td>
              <td>
                <p-tag
                  [value]="log.action"
                  [severity]="getActionSeverity(log.action)"
                ></p-tag>
              </td>
              <td>
                @if (log.action === 'updated' && log.old_value && log.new_value) {
                  @if (log.old_value.enabled !== log.new_value.enabled) {
                    <span class="text-sm">
                      enabled: {{ log.old_value.enabled }} →
                      {{ log.new_value.enabled }}
                    </span>
                  }
                  @if (
                    log.old_value.rollout_percentage !==
                    log.new_value.rollout_percentage
                  ) {
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
          <small class="text-gray-500"
            >Usar snake_case, ej: new_booking_flow</small
          >
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
          <p-inputSwitch [(ngModel)]="formData.enabled"></p-inputSwitch>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1"
            >Rollout Percentage</label
          >
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
        <p-button
          label="Cancelar"
          [text]="true"
          (onClick)="dialogVisible = false"
        ></p-button>
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
        <p-button
          label="Cancelar"
          [text]="true"
          (onClick)="deleteDialogVisible = false"
        ></p-button>
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
  readonly enabledFlags = computed(
    () => this.flags().filter((f) => f.enabled).length
  );
  readonly disabledFlags = computed(
    () => this.flags().filter((f) => !f.enabled).length
  );
  readonly partialRolloutFlags = computed(
    () =>
      this.flags().filter((f) => f.enabled && f.rollout_percentage < 100).length
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
    } catch (err) {
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
    } catch (err) {
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
