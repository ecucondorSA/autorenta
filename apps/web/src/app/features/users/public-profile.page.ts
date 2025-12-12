import { CommonModule } from '@angular/common';
import {Component, computed, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import type { Car, Review } from '../../core/models';
import { CarsService } from '../../core/services/cars.service';
import { ProfileService } from '../../core/services/profile.service';
import { ReviewsService } from '../../core/services/reviews.service';
import {
  ReviewRadarChartComponent,
  type RadarChartData,
} from '../../shared/components/review-radar-chart/review-radar-chart.component';
import { getCarImageUrl } from '../../shared/utils/car-placeholder.util';

@Component({
  selector: 'app-public-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, TranslateModule, ReviewRadarChartComponent],
  templateUrl: './public-profile.page.html',
})
export class PublicProfilePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);
  private readonly carsService = inject(CarsService);
  private readonly reviewsService = inject(ReviewsService);

  private readonly userId$ = this.route.paramMap.pipe(map((params) => params.get('id')));
  readonly userId = toSignal(this.userId$, { initialValue: null });

  readonly data$ = this.userId$.pipe(
    switchMap((userId) => {
      if (!userId)
        return of({ profile: null, stats: null, cars: [], ownerReviews: [], renterReviews: [] });
      return from(this.profileService.getProfileById(userId)).pipe(
        switchMap((profile) => {
          if (!profile)
            return of({
              profile: null,
              stats: null,
              cars: [],
              ownerReviews: [],
              renterReviews: [],
            });
          return from(this.reviewsService.getUserStats(userId)).pipe(
            switchMap((stats) => {
              return from(this.carsService.getCarsByOwner(userId)).pipe(
                switchMap((cars) => {
                  return from(this.reviewsService.getReviewsForOwner(userId)).pipe(
                    switchMap((ownerReviews) => {
                      return from(this.reviewsService.getReviewsForRenter(userId)).pipe(
                        map((renterReviews) => ({
                          profile,
                          stats,
                          cars,
                          ownerReviews,
                          renterReviews,
                        })),
                      );
                    }),
                  );
                }),
              );
            }),
          );
        }),
      );
    }),
    catchError(() =>
      of({ profile: null, stats: null, cars: [], ownerReviews: [], renterReviews: [] }),
    ),
  );

  readonly data = toSignal(this.data$, {
    initialValue: { profile: null, stats: null, cars: [], ownerReviews: [], renterReviews: [] },
  });

  readonly profile = computed(() => this.data().profile);
  readonly userStats = computed(() => this.data().stats);
  readonly userCars = computed(() => this.data().cars);
  readonly reviewsAsOwner = computed(() => this.data().ownerReviews);
  readonly reviewsAsRenter = computed(() => this.data().renterReviews);

  readonly loading = signal(true);
  readonly error = signal<string>('');

  activeTab = signal<'cars' | 'reviews-owner' | 'reviews-renter'>('cars');

  hasOwnerReviews = computed(() => this.reviewsAsOwner().length > 0);
  hasRenterReviews = computed(() => this.reviewsAsRenter().length > 0);
  hasCars = computed(() => this.userCars().length > 0);

  displayedCars = computed(() => this.userCars().slice(0, 6));
  displayedReviewsOwner = computed(() => this.reviewsAsOwner().slice(0, 3));
  displayedReviewsRenter = computed(() => this.reviewsAsRenter().slice(0, 3));

  // Radar chart data
  ownerRadarData = computed<RadarChartData | null>(() => {
    const stats = this.userStats();
    if (!stats || !stats.owner_reviews_count) return null;

    return {
      cleanliness: stats.owner_rating_cleanliness_avg || 0,
      communication: stats.owner_rating_communication_avg || 0,
      accuracy: stats.owner_rating_accuracy_avg || 0,
      location: stats.owner_rating_location_avg || 0,
      checkin: stats.owner_rating_checkin_avg || 0,
      value: stats.owner_rating_value_avg || 0,
    };
  });

  renterRadarData = computed<RadarChartData | null>(() => {
    const stats = this.userStats();
    if (!stats || !stats.renter_reviews_count) return null;

    return {
      cleanliness: stats.renter_rating_cleanliness_avg || 0,
      communication: stats.renter_rating_communication_avg || 0,
      accuracy: stats.renter_rating_accuracy_avg || 0,
      location: 0, // Renters don't have location ratings typically
      checkin: stats.renter_rating_checkin_avg || 0,
      value: 0, // Renters don't have value ratings typically
    };
  });

  averageCarPrice = computed(() => {
    const cars = this.userCars();
    if (cars.length === 0) return 0;
    const total = cars.reduce((sum: number, car: Car) => sum + (car.price_per_day || 0), 0);
    return Math.round(total / cars.length);
  });

  constructor() {
    this.data$.subscribe(() => this.loading.set(false));
  }

  setActiveTab(tab: 'cars' | 'reviews-owner' | 'reviews-renter'): void {
    this.activeTab.set(tab);
  }

  goBack(): void {
    this.router.navigate(['/cars']);
  }

  formatMemberSince(date: string): string {
    const d = new Date(date);
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  getVerificationBadgeClass(): string {
    if (this.profile()?.email_verified && this.profile()?.phone_verified) {
      return 'bg-success-light/20 dark:bg-success-light/20 text-success-700 dark:text-success-strong border-success-light/40 dark:border-success-light/40';
    }
    return 'bg-ash-gray/20 dark:bg-surface-secondary/40 text-text-secondary dark:text-text-secondary/60 border-ash-gray/30 dark:border-slate-deep/60';
  }

  getRatingStars(rating: number): string[] {
    const stars: string[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    for (let i = 0; i < fullStars; i++) stars.push('full');
    if (hasHalfStar) stars.push('half');
    while (stars.length < 5) stars.push('empty');
    return stars;
  }

  getOverallRating(review: Review): number {
    const ratings = [
      review.rating_cleanliness,
      review.rating_communication,
      review.rating_accuracy,
      review.rating_location,
      review.rating_checkin,
      review.rating_value,
    ];
    const sum = ratings.reduce((acc, r) => acc + r, 0);
    return Math.round((sum / 6) * 10) / 10;
  }

  getCarPhotoUrl(car: Car): string {
    const photos = car.photos || car.car_photos;
    return getCarImageUrl(photos, {
      brand: car.brand || car.brand_name,
      model: car.model || car.model_name,
      year: car.year,
      id: car.id,
    });
  }
}
