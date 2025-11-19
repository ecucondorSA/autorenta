import { Component, Input, Output, EventEmitter, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

// Shared Components
import { DateRangePickerComponent } from '../../../../shared/components/date-range-picker/date-range-picker.component';
import { BookingLocationFormComponent } from '../../../../shared/components/booking-location-form/booking-location-form.component';

import { BookingWizardData } from '../../pages/booking-wizard/booking-wizard.page';

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
  styleUrls: ['./booking-dates-step.component.scss']
})
export class BookingDatesStepComponent implements OnInit {
  @Input() car: any;
  @Input() data: BookingWizardData | null = null;
  @Output() dataChange = new EventEmitter<Partial<BookingWizardData>>();

  startDate = signal<Date | null>(null);
  endDate = signal<Date | null>(null);
  pickupLocation = signal<any>(null);
  dropoffLocation = signal<any>(null);
  sameLocation = signal(true);

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

  canProceed = computed(() => {
    return this.startDate() !== null &&
           this.endDate() !== null &&
           this.pickupLocation() !== null &&
           (!this.sameLocation() ? this.dropoffLocation() !== null : true);
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
          this.data.pickupLocation.address === this.data.dropoffLocation.address
        );
      }
    }
  }

  onDateRangeChange(dateRange: { startDate: Date | null; endDate: Date | null }) {
    this.startDate.set(dateRange.startDate);
    this.endDate.set(dateRange.endDate);
    this.emitChanges();
  }

  onPickupLocationChange(location: any) {
    this.pickupLocation.set(location);

    // If same location checkbox is checked, copy to dropoff
    if (this.sameLocation()) {
      this.dropoffLocation.set(location);
    }

    this.emitChanges();
  }

  onDropoffLocationChange(location: any) {
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
      dropoffLocation: this.sameLocation()
        ? this.pickupLocation()
        : this.dropoffLocation(),
    });
  }
}
