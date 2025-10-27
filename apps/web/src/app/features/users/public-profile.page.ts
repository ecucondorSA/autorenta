import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileService } from '../../core/services/profile.service';
import { CarsService } from '../../core/services/cars.service';
import { ReviewsService } from '../../core/services/reviews.service';
import type { UserProfile, Car, Review } from '../../core/models';
import { getCarImageUrl } from '../../shared/utils/car-placeholder.util';

interface UserStats {
  owner_rating_avg: number | null;
  owner_reviews_count: number;
  owner_trips_count: number;
  renter_rating_avg: number | null;
  renter_reviews_count: number;
  renter_trips_count: number;
  total_cars: number;
  member_since: string;
}

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './public-profile.page.html',
})
export class PublicProfilePage implements OnInit {
  userId = signal<string>('');
  profile = signal<Partial<UserProfile> | null>(null);
  userStats = signal<UserStats | null>(null);
  userCars = signal<Car[]>([]);
  reviewsAsOwner = signal<Review[]>([]);
  reviewsAsRenter = signal<Review[]>([]);

  loading = signal<boolean>(true);
  error = signal<string>('');

  activeTab = signal<'cars' | 'reviews-owner' | 'reviews-renter'>('cars');

  // Computed properties
  hasOwnerReviews = computed(() => this.reviewsAsOwner().length > 0);
  hasRenterReviews = computed(() => this.reviewsAsRenter().length > 0);
  hasCars = computed(() => this.userCars().length > 0);

  displayedCars = computed(() => {
    const cars = this.userCars();
    return cars.slice(0, 6); // Mostrar máximo 6 autos
  });

  displayedReviewsOwner = computed(() => {
    const reviews = this.reviewsAsOwner();
    return reviews.slice(0, 3); // Mostrar últimas 3 reviews
  });

  displayedReviewsRenter = computed(() => {
    const reviews = this.reviewsAsRenter();
    return reviews.slice(0, 3); // Mostrar últimas 3 reviews
  });

  averageCarPrice = computed(() => {
    const cars = this.userCars();
    if (cars.length === 0) return 0;
    const total = cars.reduce((sum, car) => sum + (car.price_per_day || 0), 0);
    return Math.round(total / cars.length);
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private profileService: ProfileService,
    private carsService: CarsService,
    private reviewsService: ReviewsService,
  ) {}

  async ngOnInit(): Promise<void> {
    const userId = this.route.snapshot.paramMap.get('id');

    if (!userId) {
      this.error.set('Usuario no encontrado');
      this.loading.set(false);
      return;
    }

    this.userId.set(userId);
    await this.loadUserData();
  }

  async loadUserData(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set('');

      // Cargar perfil público
      const profile = await this.profileService.getPublicProfile(this.userId());

      if (!profile) {
        this.error.set('Usuario no encontrado');
        this.loading.set(false);
        return;
      }

      this.profile.set(profile);

      // Cargar estadísticas
      const stats = await this.profileService.getUserStats(this.userId());
      this.userStats.set(stats);

      // Cargar autos del usuario (solo activos)
      const cars = await this.carsService.getCarsByOwner(this.userId());
      this.userCars.set(cars.filter((car) => car.status === 'active'));

      // Cargar reviews como owner
      const ownerReviews = await this.reviewsService.getReviewsForOwner(this.userId());
      this.reviewsAsOwner.set(ownerReviews);

      // Cargar reviews como renter
      const renterReviews = await this.reviewsService.getReviewsForRenter(this.userId());
      this.reviewsAsRenter.set(renterReviews);
    } catch (err) {
      console.error('Error loading user data:', err);
      this.error.set('Error al cargar el perfil del usuario');
    } finally {
      this.loading.set(false);
    }
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
    if (this.profile()?.is_email_verified && this.profile()?.is_phone_verified) {
      return 'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-400/40';
    }
    return 'bg-ash-gray/20 dark:bg-slate-deep/40 text-charcoal-medium dark:text-pearl-light/60 border-ash-gray/30 dark:border-slate-deep/60';
  }

  getRatingStars(rating: number): string[] {
    const stars: string[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push('full');
    }
    if (hasHalfStar) {
      stars.push('half');
    }
    while (stars.length < 5) {
      stars.push('empty');
    }

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
