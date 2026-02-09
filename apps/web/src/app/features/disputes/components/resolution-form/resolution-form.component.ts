import { Component, Input, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DisputesService } from '@core/services/admin/disputes.service';

@Component({
  selector: 'app-dispute-resolution-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="bg-surface-raised border border-border-default rounded-2xl p-6 shadow-sm">
      <h3 class="text-xl font-bold mb-4 text-text-primary">Fallo de Arbitraje</h3>

      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
        <!-- Favor -->
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2"
            >Resolución a favor de:</label
          >
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              (click)="setFavor('renter')"
              [class.bg-blue-600]="form.value.resolutionFavor === 'renter'"
              [class.text-white]="form.value.resolutionFavor === 'renter'"
              class="px-4 py-2 border rounded-xl text-sm transition-colors"
            >
              Arrendatario
            </button>
            <button
              type="button"
              (click)="setFavor('owner')"
              [class.bg-blue-600]="form.value.resolutionFavor === 'owner'"
              [class.text-white]="form.value.resolutionFavor === 'owner'"
              class="px-4 py-2 border rounded-xl text-sm transition-colors"
            >
              Propietario
            </button>
            <button
              type="button"
              (click)="setFavor('none')"
              [class.bg-blue-600]="form.value.resolutionFavor === 'none'"
              [class.text-white]="form.value.resolutionFavor === 'none'"
              class="px-4 py-2 border rounded-xl text-sm transition-colors"
            >
              Ninguno
            </button>
          </div>
        </div>

        <!-- Penalty (Solo si es a favor del dueño) -->
        @if (form.value.resolutionFavor === 'owner') {
          <div class="animate-in fade-in slide-in-from-top-2">
            <label class="block text-sm font-medium text-text-secondary mb-1"
              >Monto de penalidad (USD):</label
            >
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-text-muted">$</span>
              <input
                type="number"
                formControlName="penaltyAmount"
                class="w-full pl-8 pr-4 py-2 bg-surface-secondary border border-border-default rounded-xl focus:ring-2 focus:ring-cta-default outline-none"
                placeholder="0.00"
              />
            </div>
            <p class="text-xs text-text-muted mt-1">
              Máximo disponible: {{ maxDepositCents / 100 | currency: 'USD' }}
            </p>
          </div>
        }

        <!-- Notas Públicas -->
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-1"
            >Explicación para las partes:</label
          >
          <textarea
            formControlName="publicNotes"
            rows="3"
            class="w-full px-4 py-2 bg-surface-secondary border border-border-default rounded-xl outline-none"
            placeholder="Describe el motivo de la decisión..."
          ></textarea>
        </div>

        <!-- Notas Internas -->
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-1"
            >Notas internas (Solo Admin):</label
          >
          <textarea
            formControlName="internalNotes"
            rows="2"
            class="w-full px-4 py-2 bg-surface-secondary border border-border-default rounded-xl outline-none"
            placeholder="Detalles técnicos o contables..."
          ></textarea>
        </div>

        @if (error()) {
          <div class="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{{ error() }}</div>
        }

        <button
          type="submit"
          [disabled]="form.invalid || loading()"
          class="w-full py-3 bg-cta-default text-white font-bold rounded-xl hover:bg-cta-hover transition-colors disabled:opacity-50"
        >
          {{ loading() ? 'Procesando...' : 'Emitir Resolución Definitiva' }}
        </button>
      </form>
    </div>
  `,
})
export class DisputeResolutionFormComponent {
  @Input({ required: true }) disputeId!: string;
  @Input() maxDepositCents: number = 0;

  resolved = output<{ success: boolean; error?: string }>();

  private fb = inject(FormBuilder);
  private disputesService = inject(DisputesService);

  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    resolutionFavor: ['none', [Validators.required]],
    penaltyAmount: [0, [Validators.min(0)]],
    publicNotes: ['', [Validators.required, Validators.minLength(10)]],
    internalNotes: ['', []],
  });

  setFavor(favor: string) {
    this.form.patchValue({ resolutionFavor: favor });
    if (favor !== 'owner') {
      this.form.patchValue({ penaltyAmount: 0 });
    }
  }

  async submit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const val = this.form.getRawValue();
    const penaltyCents = Math.round((val.penaltyAmount || 0) * 100);

    if (penaltyCents > this.maxDepositCents) {
      this.error.set('La penalidad no puede superar el monto de la garantía.');
      this.loading.set(false);
      return;
    }

    try {
      const res = await this.disputesService.resolveDispute({
        disputeId: this.disputeId,
        resolutionFavor: val.resolutionFavor as 'owner' | 'renter' | 'none',
        penaltyCents,
        internalNotes: val.internalNotes || '',
        publicNotes: val.publicNotes || '',
      });

      if (res.success) {
        this.resolved.emit(res);
      } else {
        this.error.set(res.error || 'Error al procesar la resolución');
      }
    } catch {
      this.error.set('Error inesperado');
    } finally {
      this.loading.set(false);
    }
  }
}
