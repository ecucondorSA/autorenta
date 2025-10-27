import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { CreateReviewParams, ReviewType } from '../../../core/models';

interface RatingCategory {
  key: keyof Omit<
    CreateReviewParams,
    'booking_id' | 'reviewee_id' | 'car_id' | 'review_type' | 'comment_public' | 'comment_private'
  >;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './review-form.component.html',
  styleUrls: ['./review-form.component.css'],
})
export class ReviewFormComponent implements OnInit {
  @Input() bookingId!: string;
  @Input() revieweeId!: string;
  @Input() carId!: string;
  @Input() reviewType!: ReviewType;
  @Input() revieweeName: string = 'Usuario';
  @Input() carTitle: string = 'Vehículo';

  @Output() submitReview = new EventEmitter<CreateReviewParams>();
  @Output() cancelReview = new EventEmitter<void>();

  reviewForm!: FormGroup;
  isSubmitting = false;

  ratingCategories: RatingCategory[] = [
    {
      key: 'rating_cleanliness',
      label: 'Limpieza',
      icon: '🧼',
      description: 'Estado de limpieza del vehículo',
    },
    {
      key: 'rating_communication',
      label: 'Comunicación',
      icon: '💬',
      description: 'Rapidez y claridad en la comunicación',
    },
    {
      key: 'rating_accuracy',
      label: 'Precisión',
      icon: '✓',
      description: 'Descripción vs realidad del vehículo',
    },
    {
      key: 'rating_location',
      label: 'Ubicación',
      icon: '📍',
      description: 'Conveniencia del punto de entrega',
    },
    {
      key: 'rating_checkin',
      label: 'Check-in',
      icon: '🔑',
      description: 'Facilidad del proceso de entrega',
    },
    {
      key: 'rating_value',
      label: 'Valor',
      icon: '💰',
      description: 'Relación precio-calidad',
    },
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.reviewForm = this.fb.group({
      rating_cleanliness: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      rating_communication: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      rating_accuracy: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      rating_location: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      rating_checkin: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      rating_value: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment_public: ['', [Validators.maxLength(1000)]],
      comment_private: ['', [Validators.maxLength(500)]],
    });
  }

  setRating(category: string, rating: number): void {
    this.reviewForm.patchValue({ [category]: rating });
  }

  getRating(category: string): number {
    return this.reviewForm.get(category)?.value || 0;
  }

  getAverageRating(): number {
    const ratings = [
      this.getRating('rating_cleanliness'),
      this.getRating('rating_communication'),
      this.getRating('rating_accuracy'),
      this.getRating('rating_location'),
      this.getRating('rating_checkin'),
      this.getRating('rating_value'),
    ];

    const validRatings = ratings.filter((r) => r > 0);
    if (validRatings.length === 0) return 0;

    const sum = validRatings.reduce((acc, r) => acc + r, 0);
    return Number((sum / validRatings.length).toFixed(1));
  }

  isFormValid(): boolean {
    return this.reviewForm.valid && this.getAverageRating() > 0;
  }

  onSubmit(): void {
    if (!this.isFormValid() || this.isSubmitting) return;

    this.isSubmitting = true;

    const formValue = this.reviewForm.value;
    const params: CreateReviewParams = {
      booking_id: this.bookingId,
      reviewee_id: this.revieweeId,
      car_id: this.carId,
      review_type: this.reviewType,
      rating_cleanliness: formValue.rating_cleanliness,
      rating_communication: formValue.rating_communication,
      rating_accuracy: formValue.rating_accuracy,
      rating_location: formValue.rating_location,
      rating_checkin: formValue.rating_checkin,
      rating_value: formValue.rating_value,
      comment_public: formValue.comment_public || undefined,
      comment_private: formValue.comment_private || undefined,
    };

    this.submitReview.emit(params);
  }

  onCancel(): void {
    this.cancelReview.emit();
  }

  get isRenterToOwner(): boolean {
    return this.reviewType === 'renter_to_owner';
  }
}
