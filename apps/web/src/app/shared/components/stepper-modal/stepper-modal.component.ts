import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Car } from '../../../core/models';

export interface QuickRentStep1Data {
  name: string;
  license: string;
  selfieUrl?: string;
}

export interface QuickRentStep2Data {
  startDate: Date;
  endDate: Date;
  pickupMode: 'airport' | 'home' | 'meet';
  pickupLocation?: string;
}

export interface QuickRentStep3Data {
  paymentMethod: 'transfer' | 'cash' | 'wallet';
  totalPrice: number;
}

export interface QuickRentData {
  carId: string;
  step1: QuickRentStep1Data;
  step2: QuickRentStep2Data;
  step3: QuickRentStep3Data;
}

@Component({
  selector: 'app-stepper-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stepper-modal.component.html',
  styleUrls: ['./stepper-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepperModalComponent {
  @Input() car?: Car;
  @Input() isOpen = signal(false);
  @Input() userLocation?: { lat: number; lng: number };

  @Output() confirmStep = new EventEmitter<QuickRentData>();
  @Output() cancelStep = new EventEmitter<void>();

  readonly currentStep = signal<1 | 2 | 3>(1);
  readonly step1Data = signal<QuickRentStep1Data>({
    name: '',
    license: '',
    selfieUrl: undefined,
  });
  readonly step2Data = signal<QuickRentStep2Data>({
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    pickupMode: 'home',
    pickupLocation: undefined,
  });
  readonly step3Data = signal<QuickRentStep3Data>({
    paymentMethod: 'wallet',
    totalPrice: 0,
  });

  readonly canProceedStep1 = computed(() => {
    const data = this.step1Data();
    return !!(data.name && data.license);
  });

  readonly canProceedStep2 = computed(() => {
    const data = this.step2Data();
    return !!(data.startDate && data.endDate && data.startDate < data.endDate);
  });

  readonly totalPrice = computed(() => {
    if (!this.car) return 0;
    const step2 = this.step2Data();
    const days = Math.ceil(
      (step2.endDate.getTime() - step2.startDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    return days * this.car.price_per_day;
  });

  readonly progressPercentage = computed(() => {
    return (this.currentStep() / 3) * 100;
  });

  onStep1Next(): void {
    if (this.canProceedStep1()) {
      this.currentStep.set(2);
      this.step3Data.set({
        ...this.step3Data(),
        totalPrice: this.totalPrice(),
      });
    }
  }

  onStep2Next(): void {
    if (this.canProceedStep2()) {
      this.currentStep.set(3);
      this.step3Data.set({
        ...this.step3Data(),
        totalPrice: this.totalPrice(),
      });
    }
  }

  onStep3Confirm(): void {
    if (!this.car) return;
    this.confirmStep.emit({
      carId: this.car.id,
      step1: this.step1Data(),
      step2: this.step2Data(),
      step3: this.step3Data(),
    });
  }

  onBack(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set((this.currentStep() - 1) as 1 | 2 | 3);
    }
  }

  onCancel(): void {
    this.cancelStep.emit();
    this.reset();
  }

  onStartDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.step2Data.set({
      ...this.step2Data(),
      startDate: new Date(input.value),
    });
  }

  onEndDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.step2Data.set({
      ...this.step2Data(),
      endDate: new Date(input.value),
    });
  }

  private reset(): void {
    this.currentStep.set(1);
    this.step1Data.set({ name: '', license: '', selfieUrl: undefined });
    this.step2Data.set({
      startDate: new Date(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      pickupMode: 'home',
      pickupLocation: undefined,
    });
    this.step3Data.set({ paymentMethod: 'wallet', totalPrice: 0 });
  }
}
