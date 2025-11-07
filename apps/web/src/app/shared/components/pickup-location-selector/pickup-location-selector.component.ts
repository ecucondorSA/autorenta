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
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LocationMapPickerComponent, LocationCoordinates } from '../location-map-picker/location-map-picker.component';
import { DistanceCalculatorService } from '../../../core/services/distance-calculator.service';

export interface PickupLocationSelection {
  pickupLocation: { lat: number; lng: number; address?: string } | null;
  dropoffLocation: { lat: number; lng: number; address?: string } | null;
  deliveryRequired: boolean;
  deliveryFeeCents: number;
  distanceKm: number | null;
}

@Component({
  standalone: true,
  selector: 'app-pickup-location-selector',
  imports: [CommonModule, ReactiveFormsModule, LocationMapPickerComponent],
  templateUrl: './pickup-location-selector.component.html',
  styleUrls: ['./pickup-location-selector.component.css'],
})
export class PickupLocationSelectorComponent implements OnInit {
  @Input() carLocation!: { lat: number; lng: number; address?: string };
  @Input() userHomeLocation?: { lat: number; lng: number; address?: string } | null;

  @Output() locationSelected = new EventEmitter<PickupLocationSelection>();

  private readonly fb = inject(FormBuilder);
  private readonly distanceCalculator = inject(DistanceCalculatorService);

  readonly form = this.fb.nonNullable.group({
    pickupOption: ['car_location'], // 'car_location' | 'delivery'
  });

  readonly selectedPickupLocation = signal<LocationCoordinates | null>(null);
  readonly deliveryFeeCents = signal(0);
  readonly distanceKm = signal<number | null>(null);

  readonly deliveryOption = computed(() => this.form.value.pickupOption);
  readonly isDelivery = computed(() => this.deliveryOption() === 'delivery');

  ngOnInit(): void {
    // Set default pickup location to car location
    this.selectedPickupLocation.set({
      latitude: this.carLocation.lat,
      longitude: this.carLocation.lng,
      address: this.carLocation.address,
    });

    // Subscribe to form changes
    this.form.controls.pickupOption.valueChanges.subscribe((option) => {
      if (option === 'car_location') {
        // Reset to car location
        this.selectedPickupLocation.set({
          latitude: this.carLocation.lat,
          longitude: this.carLocation.lng,
          address: this.carLocation.address,
        });
        this.deliveryFeeCents.set(0);
        this.distanceKm.set(0);
        this.emitSelection();
      } else if (option === 'delivery' && this.userHomeLocation) {
        // Set to user home location
        this.selectedPickupLocation.set({
          latitude: this.userHomeLocation.lat,
          longitude: this.userHomeLocation.lng,
          address: this.userHomeLocation.address,
        });
        this.calculateDeliveryFee();
      }
    });
  }

  onMapLocationChange(coords: LocationCoordinates): void {
    this.selectedPickupLocation.set(coords);
    if (this.isDelivery()) {
      this.calculateDeliveryFee();
    }
  }

  private calculateDeliveryFee(): void {
    const pickup = this.selectedPickupLocation();
    if (!pickup) return;

    // Calculate distance from car to pickup location
    const distance = this.distanceCalculator.calculateDistance(
      this.carLocation.lat,
      this.carLocation.lng,
      pickup.latitude,
      pickup.longitude
    );

    this.distanceKm.set(distance);

    // Calculate delivery fee
    const fee = this.distanceCalculator.calculateDeliveryFee(distance);
    this.deliveryFeeCents.set(fee);

    this.emitSelection();
  }

  private emitSelection(): void {
    const pickup = this.selectedPickupLocation();
    if (!pickup) return;

    const selection: PickupLocationSelection = {
      pickupLocation: {
        lat: pickup.latitude,
        lng: pickup.longitude,
        address: pickup.address,
      },
      dropoffLocation: null, // TODO: Add dropoff location support
      deliveryRequired: this.isDelivery(),
      deliveryFeeCents: this.deliveryFeeCents(),
      distanceKm: this.distanceKm(),
    };

    this.locationSelected.emit(selection);
  }

  formatDeliveryFee(): string {
    return this.distanceCalculator.formatDeliveryFee(this.deliveryFeeCents());
  }

  formatDistance(): string {
    const distance = this.distanceKm();
    return distance !== null ? this.distanceCalculator.formatDistance(distance) : '0 km';
  }
}
