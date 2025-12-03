import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

// Shared Components
import { DateRangePickerComponent } from '../../../../shared/components/date-range-picker/date-range-picker.component';
import { BookingLocationFormComponent } from '../../../../shared/components/booking-location-form/booking-location-form.component';

import { BookingWizardData } from '../../pages/booking-wizard/booking-wizard.page';
import { Car } from '../../../../core/models';
import { CarAvailabilityService } from '../../../../core/services/car-availability.service';
import type { BlockedDateRange } from '../../../../shared/components/date-range-picker/date-range-picker.component';

interface LocationData {
  address: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-booking-dates-step',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DateRangePickerComponent,
    BookingLocationFormComponent,
  ],
  templateUrl: './booking-dates-step.component.html',
  styleUrls: ['./booking-dates-step.component.scss'],
})
export class BookingDatesStepComponent implements OnInit {
  @Input() car: Car | null = null;
  @Input() data: BookingWizardData | null = null;
  @Output() dataChange = new EventEmitter<Partial<BookingWizardData>>();

  private readonly availabilityService = inject(CarAvailabilityService);

  startDate = signal<Date | null>(null);
  endDate = signal<Date | null>(null);
  pickupLocation = signal<LocationData | null>(null);
  dropoffLocation = signal<LocationData | null>(null);
  sameLocation = signal(true);
  blockedRanges = signal<BlockedDateRange[]>([]);
  handoverPoints = signal<
    { address: string; lat: number; lng: number; label?: string; radius_m?: number | null }[]
  >([]);

  // Computed values
  totalDays = computed(() => {
    const start = this.startDate();
    const end = this.endDate();
    if (!start || !end) return 0;
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  });

  estimatedPrice = computed(() => {
    const days = this.totalDays();
    if (!days || !this.car) return 0;
    return days * (this.car.price_per_day || 0);
  });

  // Minimum date for date picker (today)
  readonly minDate = new Date();

  canProceed = computed(() => {
    return (
      this.startDate() !== null &&
      this.endDate() !== null &&
      this.pickupLocation() !== null &&
      (!this.sameLocation() ? this.dropoffLocation() !== null : true)
    );
  });

  ngOnInit() {
    if (this.data) {
      this.startDate.set(this.data.startDate);
      this.endDate.set(this.data.endDate);
      this.pickupLocation.set(this.data.pickupLocation);
      this.dropoffLocation.set(this.data.dropoffLocation);

      // If dropoff is different from pickup, set sameLocation to false
      if (this.data.pickupLocation && this.data.dropoffLocation) {
        this.sameLocation.set(
          this.data.pickupLocation.address === this.data.dropoffLocation.address,
        );
      }
    }

    // Cargar blackouts del auto para bloquear fechas no disponibles
    void this.loadBlackouts();
    // Cargar puntos de entrega del auto
    void this.loadHandoverPoints();
  }

  onDateRangeChange(dateRange: { from: string | null; to: string | null }) {
    // P0-029 FIX: Validate dates are not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

    const startDate = dateRange.from ? new Date(dateRange.from) : null;
    const endDate = dateRange.to ? new Date(dateRange.to) : null;

    // Validate start date is not in the past
    if (startDate && startDate < today) {
      console.warn('[P0-029] Start date cannot be in the past');
      this.startDate.set(null);
      this.endDate.set(null);
      alert('La fecha de inicio no puede ser en el pasado');
      return;
    }

    // Validate end date is after start date and not in the past
    if (endDate) {
      if (endDate < today) {
        console.warn('[P0-029] End date cannot be in the past');
        this.endDate.set(null);
        alert('La fecha de fin no puede ser en el pasado');
        return;
      }
      if (startDate && endDate <= startDate) {
        console.warn('[P0-029] End date must be after start date');
        this.endDate.set(null);
        alert('La fecha de fin debe ser posterior a la fecha de inicio');
        return;
      }
    }

    this.startDate.set(startDate);
    this.endDate.set(endDate);
    this.emitChanges();
  }

  onPickupLocationChange(location: LocationData) {
    this.pickupLocation.set(location);

    // If same location checkbox is checked, copy to dropoff
    if (this.sameLocation()) {
      this.dropoffLocation.set(location);
    }

    this.emitChanges();
  }

  onDropoffLocationChange(location: LocationData) {
    this.dropoffLocation.set(location);
    this.emitChanges();
  }

  onSameLocationToggle() {
    if (this.sameLocation()) {
      // Copy pickup to dropoff
      this.dropoffLocation.set(this.pickupLocation());
    } else {
      // Clear dropoff
      this.dropoffLocation.set(null);
    }
    this.emitChanges();
  }

  private emitChanges() {
    this.dataChange.emit({
      startDate: this.startDate(),
      endDate: this.endDate(),
      pickupLocation: this.pickupLocation(),
      dropoffLocation: this.sameLocation() ? this.pickupLocation() : this.dropoffLocation(),
    });
  }

  private async loadBlackouts(): Promise<void> {
    if (!this.car?.id) return;
    try {
      const blackouts = await this.availabilityService.getBlackouts(this.car.id);
      const ranges: BlockedDateRange[] = blackouts.map((b) => ({
        from: b.starts_at.split('T')[0],
        to: b.ends_at.split('T')[0],
      }));
      this.blockedRanges.set(ranges);
    } catch (error) {
      // No bloquear el flujo si falla; solo log en consola
      console.warn('blackouts-load', error);
    }
  }

  private async loadHandoverPoints(): Promise<void> {
    if (!this.car?.id) return;
    try {
      const points = await this.availabilityService.getHandoverPoints(this.car.id);
      const mapped = points.map((p) => ({
        address: p.kind,
        lat: p.lat,
        lng: p.lng,
        label: p.kind,
        radius_m: p.radius_m,
      }));
      this.handoverPoints.set(mapped);
    } catch (error) {
      console.warn('handover-points-load', error);
    }
  }
}
