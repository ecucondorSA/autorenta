import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowForwardOutline, calendarOutline, carSportOutline, locationOutline, searchOutline, trendingUp } from 'ionicons/icons';
import { Car } from '../../core/models';
import { CarsService } from '../../core/services/cars.service';
import { OnboardingService } from '../../core/services/onboarding.service';
import { CarCardComponent } from '../../shared/components/car-card/car-card.component';
import { InitialGoalModalComponent } from '../../shared/components/initial-goal-modal/initial-goal-modal.component';
import { OnboardingChecklistComponent } from '../../shared/components/onboarding-checklist/onboarding-checklist.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';

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
    IonButton,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    CarCardComponent,
    SkeletonLoaderComponent,
    InitialGoalModalComponent,
    OnboardingChecklistComponent,
  ],
})
export class HomePage implements OnInit {
  private readonly carsService = inject(CarsService);
  readonly onboardingService = inject(OnboardingService);

  featuredCars: Car[] = [];
  loading = true;
  searchQuery = '';

  // Onboarding signals
  readonly showInitialModal = this.onboardingService.showInitialModal;
  readonly activeChecklist = this.onboardingService.activeChecklist;

  constructor() {
    addIcons({ searchOutline, locationOutline, calendarOutline, trendingUp, arrowForwardOutline, carSportOutline });
  }

  async ngOnInit() {
    // Load onboarding status first
    await this.onboardingService.loadOnboardingStatus();

    // Then load featured cars
    await this.loadFeaturedCars();
  }

  async loadFeaturedCars() {
    this.loading = true;
    try {
      const cars = await this.carsService.listActiveCars({});
      this.featuredCars = cars.slice(0, 6);
    } catch {
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

  onSearch() { }
}
