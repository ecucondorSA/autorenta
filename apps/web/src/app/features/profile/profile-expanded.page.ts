import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProfileStore } from '../../core/stores/profile.store';
import { AuthService } from '../../core/services/auth.service';
import { MetaService } from '../../core/services/meta.service';
import { VerificationStateService } from '../../core/services/verification-state.service';
import { ReviewsService } from '../../core/services/reviews.service';
import { KycStatus } from '../../core/models';

/**
 * Profile Expanded Page - Simplified
 *
 * Shows hero section with:
 * - Avatar and basic info
 * - Stats (ratings, bookings, etc.)
 * - Verification status card
 * - Quick action: Publish Car
 *
 * All detailed sections moved to dedicated pages accessible via dropdown menu
 */
@Component({
  standalone: true,
  selector: 'app-profile-expanded-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './profile-expanded.page.html',
  styleUrls: ['./profile-expanded.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileExpandedPage {
  private readonly authService = inject(AuthService);
  private readonly metaService = inject(MetaService);
  private readonly verificationStateService = inject(VerificationStateService);
  readonly profileStore = inject(ProfileStore);
  private readonly reviewsService = inject(ReviewsService);

  // Profile signals from store
  readonly profile = this.profileStore.profile;
  readonly loading = this.profileStore.loading;
  readonly error = this.profileStore.error;

  // User stats
  readonly userStats = this.reviewsService.userStats;

  // Wallet balance - TODO: needs to be fetched from wallet_balances table
  readonly walletBalance = computed(() => 0); // Placeholder until wallet integration

  // Verification status
  readonly driverLicenseStatus = computed(() => this.getDocumentStatus('driver_license'));
  readonly vehicleRegistrationStatus = computed(() =>
    this.getDocumentStatus('vehicle_registration'),
  );
  readonly kycStatus = computed(() => this.calculateKycStatus());

  // Computed stats from userStats
  readonly renterRating = computed(() => this.userStats()?.renter_rating_avg || 0);
  readonly renterReviewsCount = computed(() => this.userStats()?.renter_reviews_count || 0);
  readonly totalBookingsAsRenter = computed(() => this.userStats()?.total_bookings_as_renter || 0);

  readonly ownerRating = computed(() => this.userStats()?.owner_rating_avg || 0);
  readonly ownerReviewsCount = computed(() => this.userStats()?.owner_reviews_count || 0);
  readonly totalBookingsAsOwner = computed(() => this.userStats()?.total_bookings_as_owner || 0);

  readonly badges = computed(() => this.userStats()?.badges || []);

  // Member since date from profile
  readonly memberSince = computed(() => this.profile()?.created_at);

  // Avatar and user info
  readonly avatarUrl = computed(() => this.profile()?.avatar_url);
  readonly userEmail = computed(() => this.authService.session$()?.user?.email ?? this.profile()?.id);

  // UI state - delegated to ProfileStore
  readonly uploadingAvatar = this.profileStore.uploadingAvatar;
  readonly message = signal<string | null>(null);

  constructor() {
    // Set page metadata
    this.metaService.updateMeta({
      title: 'Mi Perfil - AutoRenta',
      description: 'Gestiona tu perfil, configuración y preferencias en AutoRenta',
    });

    // Load profile data
    void this.profileStore.loadProfile();

    // Load user stats when profile is available
    effect(() => {
      const profile = this.profile();
      if (profile?.id) {
        void this.reviewsService.loadUserStats(profile.id);
      }
    });
  }

  /**
   * Check if user can publish cars
   */
  canPublishCars(): boolean {
    const role = this.profile()?.role;
    return role === 'owner' || role === 'both';
  }

  /**
   * Get badge visual properties
   */
  getBadgeProps(type: string): { color: string; icon: string } {
    const badgeMap: Record<string, { color: string; icon: string }> = {
      top_host: { color: 'text-warning-light', icon: 'star' },
      super_host: { color: 'text-warning-light', icon: 'award' },
      verified_renter: { color: 'text-success-text', icon: 'check-circle' },
      trusted_driver: { color: 'text-info-text', icon: 'check-circle' },
    };
    return badgeMap[type] || { color: 'text-text-muted', icon: 'check-circle' };
  }

  /**
   * Check if user can book cars
   */
  canBookCars(): boolean {
    const role = this.profile()?.role;
    return role === 'renter' || role === 'both';
  }

  /**
   * Get document status by kind
   * TODO: This needs to fetch from user_documents table
   */
  private getDocumentStatus(_kind: string): KycStatus {
    // Temporarily return not_started until we integrate user_documents
    return 'not_started';
  }

  /**
   * Calculate overall KYC status
   */
  private calculateKycStatus(): KycStatus {
    const dl = this.driverLicenseStatus();
    const vr = this.vehicleRegistrationStatus();

    if (dl === 'verified' && vr === 'verified') {
      return 'verified';
    }

    if (dl === 'rejected' || vr === 'rejected') {
      return 'rejected';
    }

    if (dl === 'pending' || vr === 'pending') {
      return 'pending';
    }

    return 'not_started';
  }

  /**
   * Get CSS class for KYC status
   */
  getKycStatusClass(status: KycStatus): string {
    const classMap: Record<KycStatus, string> = {
      verified: 'text-success-text dark:text-success-200',
      pending: 'text-warning-text dark:text-warning-200',
      rejected: 'text-error-text dark:text-error-200',
      not_started: 'text-text-muted dark:text-text-secondary/50',
    };

    return classMap[status] || classMap.not_started;
  }

  /**
   * Get label for KYC status
   */
  getKycStatusLabel(status: KycStatus): string {
    const labelMap: Record<KycStatus, string> = {
      verified: 'Verificado',
      pending: 'En Revisión',
      rejected: 'Rechazado',
      not_started: 'Sin Enviar',
    };

    return labelMap[status] || labelMap.not_started;
  }

  /**
   * Handle avatar change - uploads file to Supabase Storage
   */
  async onAvatarChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.message.set('Por favor selecciona una imagen válida');
      setTimeout(() => this.message.set(null), 3000);
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      this.message.set('La imagen debe ser menor a 2MB');
      setTimeout(() => this.message.set(null), 3000);
      return;
    }

    try {
      await this.profileStore.uploadAvatar(file);
      this.message.set('¡Foto de perfil actualizada!');
      setTimeout(() => this.message.set(null), 3000);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      this.message.set('Error al subir la imagen. Intenta de nuevo.');
      setTimeout(() => this.message.set(null), 3000);
    }

    // Clear input value to allow re-selecting same file
    input.value = '';
  }
}
