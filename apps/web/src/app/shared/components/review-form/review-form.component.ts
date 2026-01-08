import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { CreateReviewParams, ReviewType } from '../../../core/models';

interface RatingCategory {
  key: string;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-review-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslateModule],
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
  hoverRatings: Record<string, number> = {};

  // Categorías para Renter → Owner (evalúa auto/propietario)
  private readonly renterToOwnerCategories: RatingCategory[] = [
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
      description: 'Rapidez y claridad del propietario',
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

  // Categorías para Owner → Renter (evalúa arrendatario)
  private readonly ownerToRenterCategories: RatingCategory[] = [
    {
      key: 'rating_communication',
      label: 'Comunicación',
      icon: '💬',
      description: 'Claridad y respuesta del arrendatario',
    },
    {
      key: 'rating_punctuality',
      label: 'Puntualidad',
      icon: '⏰',
      description: 'Cumplimiento de horarios acordados',
    },
    {
      key: 'rating_care',
      label: 'Cuidado',
      icon: '🚗',
      description: 'Cómo cuidó y devolvió el vehículo',
    },
    {
      key: 'rating_rules',
      label: 'Reglas',
      icon: '📋',
      description: 'Respeto de las condiciones del alquiler',
    },
    {
      key: 'rating_recommend',
      label: 'Recomendación',
      icon: '⭐',
      description: '¿Alquilarías nuevamente a este usuario?',
    },
  ];

  // Categorías activas según el tipo de review
  ratingCategories: RatingCategory[] = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    // Seleccionar categorías según el tipo de review
    this.ratingCategories =
      this.reviewType === 'renter_to_owner'
        ? this.renterToOwnerCategories
        : this.ownerToRenterCategories;

    // Debug: Log which categories are loaded
    console.log('[ReviewForm] Categories loaded:', {
      reviewType: this.reviewType,
      categoriesCount: this.ratingCategories.length,
      categoryKeys: this.ratingCategories.map((c) => c.key),
    });

    this.initForm();
  }

  private initForm(): void {
    // Crear form dinámicamente según las categorías
    const formControls: Record<string, unknown> = {};

    for (const category of this.ratingCategories) {
      formControls[category.key] = [0, [Validators.required, Validators.min(1), Validators.max(5)]];
    }

    formControls['comment_public'] = ['', [Validators.maxLength(1000)]];
    formControls['comment_private'] = ['', [Validators.maxLength(500)]];

    this.reviewForm = this.fb.group(formControls);
  }

  setRating(category: string, rating: number): void {
    this.reviewForm.patchValue({ [category]: rating });
  }

  getRating(category: string): number {
    return this.reviewForm.get(category)?.value || 0;
  }

  getAverageRating(): number {
    // Calcular promedio dinámicamente según las categorías activas
    const ratings = this.ratingCategories.map((cat) => this.getRating(cat.key));

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

    // Construir params dinámicamente según el tipo de review
    const baseParams = {
      booking_id: this.bookingId,
      reviewee_id: this.revieweeId,
      car_id: this.carId,
      review_type: this.reviewType,
      rating_communication: formValue.rating_communication,
      comment_public: formValue.comment_public || undefined,
      comment_private: formValue.comment_private || undefined,
    };

    let params: CreateReviewParams;

    if (this.reviewType === 'renter_to_owner') {
      params = {
        ...baseParams,
        review_type: 'renter_to_owner',
        rating_cleanliness: formValue.rating_cleanliness,
        rating_accuracy: formValue.rating_accuracy,
        rating_location: formValue.rating_location,
        rating_checkin: formValue.rating_checkin,
        rating_value: formValue.rating_value,
      };
    } else {
      params = {
        ...baseParams,
        review_type: 'owner_to_renter',
        rating_punctuality: formValue.rating_punctuality,
        rating_care: formValue.rating_care,
        rating_rules: formValue.rating_rules,
        rating_recommend: formValue.rating_recommend,
      };
    }

    this.submitReview.emit(params);
  }

  onCancel(): void {
    this.cancelReview.emit();
  }

  get isRenterToOwner(): boolean {
    return this.reviewType === 'renter_to_owner';
  }

  onStarHover(category: string, rating: number): void {
    this.hoverRatings[category] = rating;
  }

  onStarLeave(category: string): void {
    delete this.hoverRatings[category];
  }

  getHoverRating(category: string): number {
    return this.hoverRatings[category] || 0;
  }
}
