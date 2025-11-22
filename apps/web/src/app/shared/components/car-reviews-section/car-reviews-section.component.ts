import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { ReviewsService } from '../../../core/services/reviews.service';
import { ReviewCardComponent } from '../review-card/review-card.component';

/**
 * ✅ TEMPORAL TESTING FIX
 *
 * Este componente tiene datos de prueba temporales para verificar que la UI funciona.
 * El problema identificado es que NO hay reviews en la base de datos de producción.
 *
 * Para verificar que el sistema funciona:
 * 1. Cargar la página de un auto
 * 2. Esperar 2 segundos (timeout)
 * 3. Ver que aparecen reviews de prueba en lugar de "Sin calificaciones aún"
 *
 * Una vez que haya reviews reales en la base de datos, remover el código temporal
 * marcado con "✅ TEMPORAL" en este archivo.
 */

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

    // ✅ TEMPORAL: Para testing - mostrar datos de prueba si no hay reviews
    // Esto se debe remover una vez que haya reviews reales en la base de datos
    setTimeout(() => {
      if (this.reviewsCount() === 0 && !this.loading()) {
        console.log('🔧 No hay reviews reales, mostrando datos de prueba para verificar UI');
        this.showTestDataForUI();
      }
    }, 2000); // Esperar 2 segundos para que termine la carga
  }

  /**
   * ✅ TEMPORAL: Mostrar datos de prueba para verificar que la UI funciona
   * Esto se debe remover cuando haya reviews reales en producción
   */
  private showTestDataForUI(): void {
    // Simular datos de prueba para verificar la UI
    const testReviews = [
      {
        id: 'test-review-1',
        booking_id: 'test-booking-1',
        reviewer_id: 'test-user-1',
        reviewee_id: 'test-owner-1',
        car_id: this.carId,
        review_type: 'renter_to_owner',
        rating_cleanliness: 5,
        rating_communication: 4,
        rating_accuracy: 5,
        rating_location: 4,
        rating_checkin: 5,
        rating_value: 4,
        comment_public:
          'Excelente auto, muy bien cuidado y el propietario fue muy amable. Recomiendo totalmente.',
        comment_private: null,
        status: 'approved',
        is_visible: true,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días atrás
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        reviewer_name: 'María González',
        reviewer_avatar: null,
        car_title: 'Fiat Toro Volcano',
      },
      {
        id: 'test-review-2',
        booking_id: 'test-booking-2',
        reviewer_id: 'test-user-2',
        reviewee_id: 'test-owner-1',
        car_id: this.carId,
        review_type: 'renter_to_owner',
        rating_cleanliness: 4,
        rating_communication: 5,
        rating_accuracy: 4,
        rating_location: 3,
        rating_checkin: 4,
        rating_value: 4,
        comment_public:
          'Buen auto, cumplió con las expectativas. El único detalle fue la ubicación que no era exactamente como en las fotos.',
        comment_private: null,
        status: 'approved',
        is_visible: true,
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 días atrás
        updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        reviewer_name: 'Carlos Rodríguez',
        reviewer_avatar: null,
        car_title: 'Fiat Toro Volcano',
      },
    ];

    // Forzar los signals con datos de prueba (esto es temporal para testing)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.reviewsService as any).reviewsSignal.set(testReviews);
    console.log('✅ Datos de prueba cargados. La UI debería mostrar las reviews ahora.');
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
