import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SettlementService,
  DamageItem,
  DamageType,
} from '../../../core/services/settlement.service';

/**
 * Componente para reportar daños y crear claims
 *
 * Standalone component que permite al propietario (locador):
 * - Reportar múltiples daños
 * - Especificar tipo, severidad y costo estimado
 * - Subir fotos de evidencia
 * - Crear claim para procesamiento
 *
 * Uso:
 * ```typescript
 * const modal = await this.modalCtrl.create({
 *   component: ClaimFormComponent,
 *   componentProps: { bookingId: '...' }
 * });
 * ```
 */
@Component({
  selector: 'app-claim-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './claim-form.component.html',
  styleUrl: './claim-form.component.css',
})
export class ClaimFormComponent implements OnInit {
  @Input() bookingId!: string;

  private readonly settlementService = inject(SettlementService);

  // Estado del componente
  readonly damages = signal<DamageItem[]>([]);
  readonly creating = signal(false);
  readonly error = signal<string | null>(null);
  notes = '';

  // Opciones de daños
  readonly damageTypes: Array<{ value: DamageType; label: string }> = [
    { value: 'scratch', label: 'Rayón' },
    { value: 'dent', label: 'Abolladura' },
    { value: 'broken_glass', label: 'Vidrio roto' },
    { value: 'tire_damage', label: 'Daño en neumático' },
    { value: 'mechanical', label: 'Falla mecánica' },
    { value: 'interior', label: 'Daño interior' },
    { value: 'missing_item', label: 'Artículo faltante' },
    { value: 'other', label: 'Otro' },
  ];

  readonly severityOptions: Array<{
    value: 'minor' | 'moderate' | 'severe';
    label: string;
    hint: string;
  }> = [
    { value: 'minor', label: 'Menor', hint: 'Daño superficial, fácil de reparar' },
    { value: 'moderate', label: 'Moderado', hint: 'Requiere reparación profesional' },
    { value: 'severe', label: 'Severo', hint: 'Daño significativo o estructural' },
  ];

  // Computed properties
  readonly totalCost = computed(() => {
    return this.damages().reduce((sum, d) => sum + (d.estimatedCostUsd || 0), 0);
  });

  readonly isValid = computed(() => {
    const damagesList = this.damages();
    if (damagesList.length === 0) return false;

    // Validar que todos los daños tengan los campos requeridos
    return damagesList.every(
      (d) => d.type && d.description.trim().length > 0 && d.severity && d.estimatedCostUsd > 0,
    );
  });

  readonly damageCount = computed(() => this.damages().length);

  ngOnInit(): void {
    if (!this.bookingId) {
      this.error.set('Falta el ID de la reserva');
    }

    // Agregar un daño vacío por defecto
    this.addDamage();
  }

  /**
   * Agrega un nuevo daño a la lista
   */
  addDamage(): void {
    const newDamage: DamageItem = {
      type: 'scratch',
      description: '',
      estimatedCostUsd: 0,
      photos: [],
      severity: 'minor',
    };

    this.damages.update((d) => [...d, newDamage]);
  }

  /**
   * Elimina un daño de la lista
   */
  removeDamage(index: number): void {
    if (this.damages().length <= 1) {
      alert('Debe haber al menos un daño reportado');
      return;
    }

    this.damages.update((d) => d.filter((_, i) => i !== index));
  }

  /**
   * Actualiza un daño específico
   */
  updateDamage(index: number, field: keyof DamageItem, value: unknown): void {
    this.damages.update((damages) => {
      const updated = [...damages];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  /**
   * Calcula costo estimado según tipo y severidad
   */
  estimateCost(type: DamageType, severity: 'minor' | 'moderate' | 'severe'): number {
    return this.settlementService.estimateDamageCost(type, severity);
  }

  /**
   * Auto-completa el costo según tipo y severidad
   */
  autoEstimateCost(index: number): void {
    const damage = this.damages()[index];
    if (damage) {
      const estimated = this.estimateCost(damage.type, damage.severity);
      this.updateDamage(index, 'estimatedCostUsd', estimated);
    }
  }

  /**
   * Obtiene el label de un tipo de daño
   */
  getDamageTypeLabel(type: DamageType): string {
    return this.damageTypes.find((t) => t.value === type)?.label ?? type;
  }

  /**
   * Obtiene el label de una severidad
   */
  getSeverityLabel(severity: 'minor' | 'moderate' | 'severe'): string {
    return this.severityOptions.find((s) => s.value === severity)?.label ?? severity;
  }

  /**
   * Maneja la selección de fotos para un daño
   */
  async onPhotosSelected(event: Event, index: number): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);

    // Validar que sean imágenes
    const invalidFiles = files.filter((f) => !f.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      this.error.set('Solo se permiten archivos de imagen');
      return;
    }

    // TODO: Subir fotos a Supabase Storage
    // Por ahora, crear URLs temporales
    const photoUrls = files.map((f) => URL.createObjectURL(f));

    this.damages.update((damages) => {
      const updated = [...damages];
      updated[index] = {
        ...updated[index],
        photos: [...updated[index].photos, ...photoUrls],
      };
      return updated;
    });

    // Limpiar input
    input.value = '';
  }

  /**
   * Elimina una foto de un daño
   */
  removePhoto(damageIndex: number, photoIndex: number): void {
    this.damages.update((damages) => {
      const updated = [...damages];
      updated[damageIndex] = {
        ...updated[damageIndex],
        photos: updated[damageIndex].photos.filter((_, i) => i !== photoIndex),
      };
      return updated;
    });
  }

  /**
   * Envía el claim
   */
  async submit(): Promise<void> {
    if (!this.isValid()) {
      this.error.set('Complete todos los campos requeridos');
      return;
    }

    this.creating.set(true);
    this.error.set(null);

    try {
      const claim = await this.settlementService.createClaim(
        this.bookingId,
        this.damages(),
        this.notes || undefined,
      );

      if (!claim) {
        throw new Error('No se pudo crear el claim');
      }

      console.log('✅ Claim creado:', claim);

      // Cerrar modal y retornar claim
      this.closeModal(claim);
    } catch (error) {
      console.error('Error creating claim:', error);
      this.error.set(
        error instanceof Error ? error.message : 'Error al crear claim. Intente nuevamente.',
      );
    } finally {
      this.creating.set(false);
    }
  }

  /**
   * Cancela y cierra el modal
   */
  cancel(): void {
    if (this.damages().some((d) => d.description.trim().length > 0)) {
      if (!confirm('¿Descartar claim? Se perderán los datos ingresados.')) {
        return;
      }
    }
    this.closeModal(null);
  }

  /**
   * Cierra el modal (placeholder - implementar según framework de modals usado)
   */
  private closeModal(data: unknown): void {
    // TODO: Implementar cierre de modal según framework usado
    console.log('Modal should close with data:', data);

    // Si hay un callback en el window (workaround temporal)
    const windowWithCallback = window as Window & { claimFormCallback?: (data: unknown) => void };
    if (windowWithCallback.claimFormCallback) {
      windowWithCallback.claimFormCallback(data);
    }
  }
}
