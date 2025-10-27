import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Geolocation } from '@capacitor/geolocation';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonModal,
  IonList,
  IonLabel,
  IonSearchbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { optionsOutline, listOutline, locateOutline } from 'ionicons/icons';
import { CarsMapComponent } from '../../shared/components/cars-map/cars-map.component';
import { MapFiltersComponent } from '../../shared/components/map-filters/map-filters.component';
import { CarCardComponent } from '../../shared/components/car-card/car-card.component';
import { CarsService } from '../../core/services/cars.service';
import { Car } from '../../core/models';

@Component({
  selector: 'app-explore',
  templateUrl: './explore.page.html',
  styleUrls: ['./explore.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    IonModal,
    IonList,
    IonLabel,
    IonSearchbar,
    CarsMapComponent,
    MapFiltersComponent,
    CarCardComponent,
  ],
})
export class ExplorePage implements OnInit, AfterViewInit {
  @ViewChild('listModal') listModal!: IonModal;
  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;

  cars: Car[] = [];
  filteredCars: Car[] = [];
  loading = true;
  showFilters = false;
  showList = false;
  searchQuery = '';

  filters = {
    minPrice: 0,
    maxPrice: 10000,
    transmission: 'all' as 'all' | 'manual' | 'automatic',
  };

  userLocation: { lat: number; lng: number } | null = null;

  constructor(private carsService: CarsService) {
    addIcons({ optionsOutline, listOutline, locateOutline });
  }

  ngOnInit() {
    this.loadCars();
    this.getUserLocation();
  }

  ngAfterViewInit() {
    if (this.mapContainer?.nativeElement) {
      // Initialize map after view is ready
    }
  }

  async loadCars() {
    this.loading = true;
    try {
      const cars = await this.carsService.listActiveCars({});
      this.cars = cars;
      this.filteredCars = this.cars;
    } catch (error) {
      console.error('Error loading cars:', error);
    } finally {
      this.loading = false;
    }
  }

  async getUserLocation() {
    try {
      const position = await Geolocation.getCurrentPosition();
      this.userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting location:', error);
    }
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  async toggleList() {
    this.showList = !this.showList;
    if (this.showList) {
      await this.listModal.present();
    }
  }

  onFiltersChange(filters: any) {
    this.filters = filters;
    this.applyFilters();
  }

  applyFilters() {
    this.filteredCars = this.cars.filter((car) => {
      const priceMatch =
        car.price_per_day >= this.filters.minPrice && car.price_per_day <= this.filters.maxPrice;
      const transmissionMatch =
        this.filters.transmission === 'all' || car.transmission === this.filters.transmission;

      return priceMatch && transmissionMatch;
    });
  }

  onCarSelected(carId: string) {
    console.log('Car selected:', carId);
  }

  resetFilters() {
    this.filters = {
      minPrice: 0,
      maxPrice: 10000,
      transmission: 'all',
    };
    this.applyFilters();
  }

  onSearch() {
    if (!this.searchQuery) {
      this.filteredCars = this.cars;
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredCars = this.cars.filter(
      (car) =>
        car.brand?.toLowerCase().includes(query) ||
        car.model?.toLowerCase().includes(query) ||
        car.location_city?.toLowerCase().includes(query),
    );
  }

  centerOnUser() {
    if (this.userLocation) {
      // Trigger map centering via service/event
      console.log('Center on user:', this.userLocation);
    }
  }

  onModalDismiss() {
    this.showList = false;
  }
}
