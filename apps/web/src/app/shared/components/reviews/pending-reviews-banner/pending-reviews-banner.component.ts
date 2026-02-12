import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ReviewsService } from '@core/services/cars/reviews.service';

interface PendingReview {
  booking_id: string;
  car_title: string;
  reviewee_name: string;
  checkout_date: string;
  days_remaining: number;
}

@Component({
  selector: 'app-pending-reviews-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule],
  templateUrl: './pending-reviews-banner.component.html',
  styleUrls: ['./pending-reviews-banner.component.css'],
})
export class PendingReviewsBannerComponent implements OnInit {
  pendingReviews = signal<PendingReview[]>([]);
  loading = signal(false);
  isDismissed = signal(false);

  constructor(private reviewsService: ReviewsService) {}

  async ngOnInit(): Promise<void> {
    // Check if banner was dismissed in this session
    const dismissed = sessionStorage.getItem('pending-reviews-banner-dismissed');
    if (dismissed === 'true') {
      this.isDismissed.set(true);
      return;
    }

    await this.loadPendingReviews();
  }

  async loadPendingReviews(): Promise<void> {
    this.loading.set(true);
    try {
      const reviews = await this.reviewsService.getPendingReviews();
      this.pendingReviews.set(reviews);
    } catch {
      /* Silenced */
    } finally {
      this.loading.set(false);
    }
  }

  dismiss(): void {
    this.isDismissed.set(true);
    sessionStorage.setItem('pending-reviews-banner-dismissed', 'true');
  }

  get hasPendingReviews(): boolean {
    return this.pendingReviews().length > 0;
  }

  get urgentReviews(): PendingReview[] {
    return this.pendingReviews().filter((r) => r.days_remaining <= 3);
  }

  get hasUrgentReviews(): boolean {
    return this.urgentReviews.length > 0;
  }
}
