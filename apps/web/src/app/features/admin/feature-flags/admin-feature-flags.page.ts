import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import {
  CreateFeatureFlagDto,
  FeatureFlag,
  FeatureFlagAuditLog,
} from '@core/models/feature-flag.model';
import { FeatureFlagService } from '@core/services/infrastructure/feature-flag.service';

@Component({
  selector: 'app-admin-feature-flags',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/admin"></ion-back-button>
        </ion-buttons>
        <ion-title>Feature Flags</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <ion-card class="m-0">
          <ion-card-content class="text-center py-3">
            <div class="text-2xl font-bold text-blue-500">{{ totalFlags() }}</div>
            <div class="text-gray-500 text-sm">Total</div>
          </ion-card-content>
        </ion-card>
        <ion-card class="m-0">
          <ion-card-content class="text-center py-3">
            <div class="text-2xl font-bold text-green-500">{{ enabledFlags() }}</div>
            <div class="text-gray-500 text-sm">Habilitadas</div>
          </ion-card-content>
        </ion-card>
        <ion-card class="m-0">
          <ion-card-content class="text-center py-3">
            <div class="text-2xl font-bold text-red-500">{{ disabledFlags() }}</div>
            <div class="text-gray-500 text-sm">Deshabilitadas</div>
          </ion-card-content>
        </ion-card>
        <ion-card class="m-0">
          <ion-card-content class="text-center py-3">
            <div class="text-2xl font-bold text-orange-500">{{ partialRolloutFlags() }}</div>
            <div class="text-gray-500 text-sm">Parcial</div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Create/Edit Form (inline, no modal) -->
      @if (showForm()) {
        <ion-card class="mb-4">
          <ion-card-header>
            <ion-card-title>
              {{ editingFlag() ? 'Editar Feature Flag' : 'Nueva Feature Flag' }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="space-y-4">
              <ion-item>
                <ion-label position="stacked">Nombre</ion-label>
                <ion-input
                  [(ngModel)]="formData.name"
                  [disabled]="!!editingFlag()"
                  placeholder="feature_name"
                ></ion-input>
              </ion-item>
              <p class="text-xs text-gray-500 px-4 -mt-2">Usar snake_case, ej: new_booking_flow</p>

              <ion-item>
                <ion-label position="stacked">Descripción</ion-label>
                <ion-input
                  [(ngModel)]="formData.description"
                  placeholder="Descripción de la feature"
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-label>Habilitada</ion-label>
                <ion-toggle [(ngModel)]="formData.enabled" slot="end"></ion-toggle>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">Rollout Percentage</ion-label>
                <ion-input
                  type="number"
                  [(ngModel)]="formData.rollout_percentage"
                  min="0"
                  max="100"
                  placeholder="100"
                ></ion-input>
              </ion-item>
              <p class="text-xs text-gray-500 px-4 -mt-2">
                Porcentaje de usuarios que veran la feature (0-100%)
              </p>

              <div class="flex gap-2 pt-2 px-4">
                <ion-button fill="outline" (click)="cancelForm()"> Cancelar </ion-button>
                <ion-button (click)="saveFlag()" [disabled]="saving()">
                  @if (saving()) {
                    <ion-spinner name="crescent" class="w-4 h-4 mr-2"></ion-spinner>
                  }
                  {{ editingFlag() ? 'Guardar' : 'Crear' }}
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      }

      <!-- Add Button -->
      @if (!showForm()) {
        <div class="mb-4">
          <ion-button (click)="showCreateForm()">
            <ion-icon name="add" slot="start"></ion-icon>
            Nueva Flag
          </ion-button>
        </div>
      }

      <!-- Feature Flags List -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Feature Flags</ion-card-title>
        </ion-card-header>
        <ion-card-content class="p-0">
          @if (loading()) {
            <div class="flex justify-center py-8">
              <ion-spinner name="crescent"></ion-spinner>
            </div>
          } @else if (flags().length === 0) {
            <div class="text-center py-8 text-gray-500">No hay feature flags configuradas</div>
          } @else {
            <ion-list>
              @for (flag of flags(); track flag.id) {
                <ion-item>
                  <div class="flex-1 py-2">
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-mono text-sm font-medium">{{ flag.name }}</span>
                      <ion-toggle
                        [(ngModel)]="flag.enabled"
                        (ionChange)="toggleFlag(flag)"
                      ></ion-toggle>
                    </div>
                    @if (flag.description) {
                      <p class="text-sm text-gray-500 mb-2">{{ flag.description }}</p>
                    }
                    <div class="flex items-center gap-2 text-xs">
                      <span
                        class="px-2 py-0.5 rounded-full text-white"
                        [class.bg-green-500]="flag.rollout_percentage === 100"
                        [class.bg-blue-500]="
                          flag.rollout_percentage >= 50 && flag.rollout_percentage < 100
                        "
                        [class.bg-orange-500]="
                          flag.rollout_percentage > 0 && flag.rollout_percentage < 50
                        "
                        [class.bg-red-500]="flag.rollout_percentage === 0"
                      >
                        {{ flag.rollout_percentage }}%
                      </span>
                      <span class="text-gray-400">
                        {{ flag.updated_at | date: 'shortDate' }}
                      </span>
                    </div>
                  </div>
                  <ion-buttons slot="end">
                    <ion-button fill="clear" (click)="editFlag(flag)">
                      <ion-icon name="create-outline" slot="icon-only"></ion-icon>
                    </ion-button>
                    <ion-button fill="clear" color="danger" (click)="confirmDelete(flag)">
                      <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                    </ion-button>
                  </ion-buttons>
                </ion-item>
              }
            </ion-list>
          }
        </ion-card-content>
      </ion-card>

      <!-- Delete Confirmation (inline panel, no modal) -->
      @if (flagToDelete()) {
        <ion-card class="mt-4 border-2 border-red-300">
          <ion-card-header>
            <ion-card-title class="text-red-600">Confirmar Eliminación</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p class="mb-2">
              ¿Estás seguro de eliminar la flag
              <strong class="font-mono">{{ flagToDelete()?.name }}</strong
              >?
            </p>
            <p class="text-sm text-red-500 mb-4">Esta acción no se puede deshacer.</p>
            <div class="flex gap-2">
              <ion-button fill="outline" (click)="flagToDelete.set(null)"> Cancelar </ion-button>
              <ion-button color="danger" (click)="deleteFlag()" [disabled]="deleting()">
                @if (deleting()) {
                  <ion-spinner name="crescent" class="w-4 h-4 mr-2"></ion-spinner>
                }
                Eliminar
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      }

      <!-- Audit Log -->
      <ion-card class="mt-4">
        <ion-card-header>
          <ion-card-title>Historial de Cambios</ion-card-title>
        </ion-card-header>
        <ion-card-content class="p-0">
          @if (loadingAudit()) {
            <div class="flex justify-center py-4">
              <ion-spinner name="crescent"></ion-spinner>
            </div>
          } @else {
            <ion-list>
              @for (log of auditLog().slice(0, 10); track log.id) {
                <ion-item>
                  <div class="py-2 w-full">
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-mono text-xs">{{ log.feature_flag_name }}</span>
                      <span
                        class="px-2 py-0.5 rounded text-xs text-white"
                        [class.bg-green-500]="log.action === 'created'"
                        [class.bg-blue-500]="log.action === 'updated'"
                        [class.bg-red-500]="log.action === 'deleted'"
                      >
                        {{ log.action }}
                      </span>
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ log.changed_at | date: 'short' }}
                    </div>
                    @if (log.action === 'updated' && log.old_value && log.new_value) {
                      <div class="mt-1 text-xs text-gray-600">
                        @if (log.old_value.enabled !== log.new_value.enabled) {
                          enabled: {{ log.old_value.enabled }} → {{ log.new_value.enabled }}
                        }
                        @if (
                          log.old_value.rollout_percentage !== log.new_value.rollout_percentage
                        ) {
                          rollout: {{ log.old_value.rollout_percentage }}% →
                          {{ log.new_value.rollout_percentage }}%
                        }
                      </div>
                    }
                  </div>
                </ion-item>
              }
            </ion-list>
          }
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
})
export class AdminFeatureFlagsPage implements OnInit {
  private readonly featureFlagService = inject(FeatureFlagService);
  private readonly toastController = inject(ToastController);

  // State
  readonly flags = this.featureFlagService.flags;
  readonly loading = this.featureFlagService.loading;
  readonly auditLog = signal<FeatureFlagAuditLog[]>([]);
  readonly loadingAudit = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly editingFlag = signal<FeatureFlag | null>(null);
  readonly flagToDelete = signal<FeatureFlag | null>(null);
  readonly showForm = signal(false);

  // Computed stats
  readonly totalFlags = computed(() => this.flags().length);
  readonly enabledFlags = computed(() => this.flags().filter((f) => f.enabled).length);
  readonly disabledFlags = computed(() => this.flags().filter((f) => !f.enabled).length);
  readonly partialRolloutFlags = computed(
    () => this.flags().filter((f) => f.enabled && f.rollout_percentage < 100).length,
  );

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
      await this.showToast('No se pudo cargar el historial', 'danger');
    } finally {
      this.loadingAudit.set(false);
    }
  }

  showCreateForm(): void {
    this.editingFlag.set(null);
    this.formData = {
      name: '',
      description: '',
      enabled: false,
      rollout_percentage: 100,
    };
    this.showForm.set(true);
  }

  editFlag(flag: FeatureFlag): void {
    this.editingFlag.set(flag);
    this.formData = {
      name: flag.name,
      description: flag.description || '',
      enabled: flag.enabled,
      rollout_percentage: flag.rollout_percentage,
    };
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingFlag.set(null);
  }

  async saveFlag(): Promise<void> {
    if (!this.formData.name) {
      await this.showToast('El nombre es requerido', 'warning');
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
        await this.showToast('Feature flag actualizada', 'success');
      } else {
        await this.featureFlagService.createFlag(this.formData);
        await this.showToast('Feature flag creada', 'success');
      }
      this.showForm.set(false);
      this.editingFlag.set(null);
      await this.loadAuditLog();
    } catch (err) {
      await this.showToast(err instanceof Error ? err.message : 'Error al guardar', 'danger');
    } finally {
      this.saving.set(false);
    }
  }

  async toggleFlag(flag: FeatureFlag): Promise<void> {
    try {
      await this.featureFlagService.toggleFlag(flag.id, flag.enabled);
      await this.showToast(
        `${flag.name} ${flag.enabled ? 'habilitada' : 'deshabilitada'}`,
        'success',
      );
      await this.loadAuditLog();
    } catch {
      // Revert the toggle
      flag.enabled = !flag.enabled;
      await this.showToast('No se pudo actualizar la flag', 'danger');
    }
  }

  confirmDelete(flag: FeatureFlag): void {
    this.flagToDelete.set(flag);
  }

  async deleteFlag(): Promise<void> {
    const flag = this.flagToDelete();
    if (!flag) return;

    this.deleting.set(true);
    try {
      await this.featureFlagService.deleteFlag(flag.id);
      await this.showToast(`Feature flag ${flag.name} eliminada`, 'success');
      this.flagToDelete.set(null);
      await this.loadAuditLog();
    } catch {
      await this.showToast('No se pudo eliminar la flag', 'danger');
    } finally {
      this.deleting.set(false);
    }
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
