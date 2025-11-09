import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonChip,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, locationOutline, calendarOutline, trendingUp } from 'ionicons/icons';
import { CarCardComponent } from '../../shared/components/car-card/car-card.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { CarsService } from '../../core/services/cars.service';
import { Car } from '../../core/models';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSearchbar,
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonChip,
    IonLabel,
    IonRefresher,
    IonRefresherContent,
    CarCardComponent,
    SkeletonLoaderComponent,
  ],
})
export class HomePage implements OnInit {
  featuredCars: Car[] = [];
  loading = true;
  searchQuery = '';

  constructor(private carsService: CarsService) {
    addIcons({ searchOutline, locationOutline, calendarOutline, trendingUp });
  }

  ngOnInit() {
    this.loadFeaturedCars();
  }

  async loadFeaturedCars() {
    this.loading = true;
    try {
      const cars = await this.carsService.listActiveCars({});
      this.featuredCars = cars.slice(0, 6);
    } catch (__error) {
      /* Silenced */
    } finally {
      this.loading = false;
    }
  }

  handleRefresh(event: { target: { complete: () => void } }) {
    this.loadFeaturedCars().then(() => {
      event.target.complete();
    });
  }

  onSearch() {}
}
