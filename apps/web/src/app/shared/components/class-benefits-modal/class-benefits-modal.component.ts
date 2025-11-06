import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DriverProfileService, ClassBenefits } from '../../../core/services/driver-profile.service';

@Component({
  selector: 'app-class-benefits-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './class-benefits-modal.component.html',
  styleUrls: ['./class-benefits-modal.component.css'],
})
export class ClassBenefitsModalComponent implements OnInit {
  private readonly driverProfileService = inject(DriverProfileService);

  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();

  benefits: ClassBenefits | null = null;
  loading: boolean = false;
  error: string | null = null;

  readonly driverClass = this.driverProfileService.driverClass;
  readonly cleanPercentage = this.driverProfileService.cleanPercentage;

  ngOnInit(): void {
    if (this.isOpen) {
      this.loadBenefits();
    }
  }

  async loadBenefits(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      this.benefits = await new Promise((resolve, reject) => {
        this.driverProfileService.getClassBenefits().subscribe({
          next: (data) => resolve(data),
          error: (err) => reject(err),
        });
      });
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Error al cargar beneficios';
    } finally {
      this.loading = false;
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  getClassColor(classNum: number): string {
    if (classNum <= 2) return 'text-green-600';
    if (classNum <= 4) return 'text-blue-600';
    if (classNum <= 6) return 'text-yellow-600';
    if (classNum <= 8) return 'text-orange-600';
    return 'text-red-600';
  }

  getClassBadgeColor(classNum: number): string {
    if (classNum <= 2) return 'bg-green-500';
    if (classNum <= 4) return 'bg-blue-500';
    if (classNum <= 6) return 'bg-yellow-500';
    if (classNum <= 8) return 'bg-orange-500';
    return 'bg-red-500';
  }

  getFeeDiscountLabel(multiplier: number): string {
    if (multiplier >= 1) return 'Sin descuento';
    const discount = Math.round((1 - multiplier) * 100);
    return `${discount}% descuento`;
  }

  getGuaranteeDiscountLabel(multiplier: number): string {
    if (multiplier >= 1) return 'Sin descuento';
    const discount = Math.round((1 - multiplier) * 100);
    return `${discount}% menos`;
  }

  getSavingsExample(feeMultiplier: number, guaranteeMultiplier: number): string {
    // Example: Base fee $50/day, guarantee $200
    const baseFee = 50;
    const baseGuarantee = 200;

    const adjustedFee = baseFee * feeMultiplier;
    const adjustedGuarantee = baseGuarantee * guaranteeMultiplier;

    const feeSavings = baseFee - adjustedFee;
    const guaranteeSavings = baseGuarantee - adjustedGuarantee;
    const totalSavings = feeSavings + guaranteeSavings;

    if (totalSavings <= 0) return 'Sin ahorro';

    return `Ahorras ~USD $${Math.round(totalSavings)} por reserva`;
  }
}
