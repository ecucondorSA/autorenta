import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReviewsService } from '../../../core/services/reviews.service';
import { ReviewCardComponent } from '../review-card/review-card.component';

@Component({
  selector: 'app-car-reviews-section',
  standalone: true,
  imports: [CommonModule, ReviewCardComponent],
  templateUrl: './car-reviews-section.component.html',
  styleUrls: ['./car-reviews-section.component.css'],
})
export class CarReviewsSectionComponent implements OnInit {
  @Input({ required: true }) carId!: string;

  private readonly reviewsService = inject(ReviewsService);

  // Signals del servicio
  readonly reviews = this.reviewsService.reviews;
  readonly loading = this.reviewsService.loading;
  readonly error = this.reviewsService.error;
  readonly averageRating = this.reviewsService.averageRating;
  readonly reviewsCount = this.reviewsService.reviewsCount;

  ngOnInit(): void {
    this.reviewsService.loadReviewsForCar(this.carId);
  }

  /**
   * Get star rating display (filled stars count)
   */
  getStarRating(rating: number): Array<'filled' | 'empty'> {
    const rounded = Math.round(rating);
    return Array(5)
      .fill('empty')
      .map((_, index) => (index < rounded ? 'filled' : 'empty'));
  }
}




