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
import type { CarMapLocation } from '@core/services/cars/car-locations.service';

/**
 * Map Drawer Component
 *
 * Right-side drawer for desktop (30% width) / Bottom sheet for mobile
 * Contains:
 * - car-card extendida (foto, título, ubicación, verificación)
 * - social-proof-indicators (rating, reseñas, badges)
 * - booking-chat toggle (opcional)
 * - simple-checkout sticky footer
 *
 * Desktop: Slide-in from right (fixed sidebar)
 * Mobile: Bottom sheet / tab 2 in bottom-nav
 */
@Component({
  selector: 'app-map-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-drawer.component.html',
  styleUrls: ['./map-drawer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapDrawerComponent {
  @Input() selectedCar?: CarMapLocation;
  @Input() userLocation?: { lat: number; lng: number };
  @Input() isOpen = false;
  @Input() isMobile = false;

  @Output() readonly closeDrawer = new EventEmitter<void>();
  @Output() readonly reserveClick = new EventEmitter<{
    carId: string;
    paymentMethod: string;
    dates?: { start: Date; end: Date };
  }>();
  @Output() readonly chatClick = new EventEmitter<string>();

  // UI State
  readonly showChat = signal(false);
  readonly selectedPaymentMethod = signal<string | null>(null);
  readonly isCheckoutLoading = signal(false);

  // Computed
  readonly distanceKm = computed(() => {
    if (!this.selectedCar || !this.userLocation) return null;
    return this.calculateDistance(
      this.userLocation.lat,
      this.userLocation.lng,
      this.selectedCar.lat,
      this.selectedCar.lng,
    );
  });

  readonly carTitle = computed(() => {
    return this.selectedCar?.title || 'Auto sin título';
  });

  readonly carPrice = computed(() => {
    return this.selectedCar?.pricePerDay || 0;
  });

  readonly carCurrency = computed(() => {
    return this.selectedCar?.currency || 'ARS';
  });

  readonly drawerClass = computed(() => {
    const classes = ['map-drawer'];
    if (this.isOpen) classes.push('map-drawer--open');
    if (this.isMobile) classes.push('map-drawer--mobile');
    return classes.join(' ');
  });

  /**
   * Close drawer
   */
  close(): void {
    this.closeDrawer.emit();
  }

  /**
   * Toggle chat visibility
   */
  toggleChat(): void {
    this.showChat.set(!this.showChat());
    if (this.showChat() && this.selectedCar?.carId) {
      this.chatClick.emit(this.selectedCar.carId);
    }
  }

  /**
   * Handle checkout submission
   */
  onCheckoutSubmit(data: { paymentMethod: string; dates?: { start: Date; end: Date } }): void {
    if (!this.selectedCar?.carId) return;

    this.isCheckoutLoading.set(true);
    this.selectedPaymentMethod.set(data.paymentMethod);

    // Emit reserve event with payment method
    this.reserveClick.emit({
      carId: this.selectedCar.carId,
      paymentMethod: data.paymentMethod,
      dates: data.dates,
    });

    // Reset after 2 seconds
    setTimeout(() => {
      this.isCheckoutLoading.set(false);
    }, 2000);
  }

  /**
   * Navigate to car detail
   */
  goToCarDetail(): void {
    // This will be handled by parent component via router
    // Just emit an event if needed
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal
  }

  /**
   * Convert degrees to radians
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format price for display
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: this.carCurrency(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }

  /**
   * Navigate to full checkout page
   */
  navigateToCheckout(): void {
    if (!this.selectedCar) return;
    this.reserveClick.emit({
      carId: this.selectedCar.carId,
      paymentMethod: 'wallet', // Default method
    });
  }
}
