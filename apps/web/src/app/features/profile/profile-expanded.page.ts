import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfileStore } from '../../core/stores/profile.store';
import { DocumentUploadModalComponent } from '../../shared/components/document-upload-modal/document-upload-modal.component';
import { BonusMalusCardComponent } from '../../shared/components/bonus-malus-card/bonus-malus-card.component';
import { RenterLevelProgressComponent } from '../../shared/components/renter-level-progress/renter-level-progress.component';
import { AuthService } from '../../core/services/auth.service';
import { MetaService } from '../../core/services/meta.service';
import { VerificationStateService } from '../../core/services/verification-state.service';
import { VerificationService } from '../../core/services/verification.service';
import { ReviewsService } from '../../core/services/reviews.service';
import { KycStatus } from '../../core/models';

/**
 * Profile Expanded Page - Simplified
 *
 * Shows hero section with:
 * - Avatar and basic info
 * - Stats (ratings, bookings, etc.)
 * - Verification status card
 * - Quick actions: Dashboard, Wallet, Publish Car
 *
 * All detailed sections moved to dedicated pages accessible via dropdown menu
 */
@Component({
  standalone: true,
  selector: 'app-profile-expanded-page',
  imports: [CommonModule, RouterLink, DocumentUploadModalComponent, BonusMalusCardComponent, RenterLevelProgressComponent],
  templateUrl: './profile-expanded.page.html',
  styleUrls: ['./profile-expanded.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileExpandedPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly metaService = inject(MetaService);
  private readonly verificationStateService = inject(VerificationStateService);
  private readonly verificationService = inject(VerificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly profileStore = inject(ProfileStore);
  private readonly reviewsService = inject(ReviewsService);

  // Document upload modal state
  readonly showDocumentModal = signal(false);
  readonly documentType = signal<string | null>(null);

  // Profile signals from store
  readonly profile = this.profileStore.profile;
  readonly loading = this.profileStore.loading;
  readonly error = this.profileStore.error;

  // User stats
  readonly userStats = this.reviewsService.userStats;

  // Wallet balance - TODO: needs to be fetched from wallet_balances table
  readonly walletBalance = computed(() => 0); // Placeholder until wallet integration

  // Verification status from VerificationStateService
  readonly verificationProgress = this.verificationStateService.verificationProgress;

  // User documents from VerificationService
  readonly userDocuments = this.verificationService.documents;

  readonly driverLicenseStatus = computed(() => {
    const docs = this.userDocuments();
    // Check for license_front and license_back (DB enum values)
    const frontDoc = docs.find(d => d.kind === 'license_front');
    const backDoc = docs.find(d => d.kind === 'license_back');

    // Both must be uploaded and verified
    if (!frontDoc && !backDoc) return 'not_started' as KycStatus;

    const frontStatus = frontDoc?.status;
    const backStatus = backDoc?.status;

    // If either is verified, show as verified (relaxed check)
    if (frontStatus === 'verified' || backStatus === 'verified') return 'verified' as KycStatus;
    // If either is pending, show as pending
    if (frontStatus === 'pending' || backStatus === 'pending') return 'pending' as KycStatus;

    return 'not_started' as KycStatus;
  });

  readonly vehicleRegistrationStatus = computed(() => {
    const docs = this.userDocuments();
    const vehicleDoc = docs.find(d => d.kind === 'vehicle_registration');
    if (!vehicleDoc) return 'not_started' as KycStatus;
    if (vehicleDoc.status === 'verified') return 'verified' as KycStatus;
    if (vehicleDoc.status === 'pending') return 'pending' as KycStatus;
    return 'not_started' as KycStatus;
  });

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

    // Initialize verification state service
    void this.verificationStateService.initialize();

    // Load user documents for verification status
    void this.verificationService.loadDocuments();

    // Load user stats when profile is available
    effect(() => {
      const profile = this.profile();
      if (profile?.id) {
        void this.reviewsService.loadUserStats(profile.id);
      }
    });
  }

  ngOnInit(): void {
    // Handle document upload query param
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const docType = params['doc'];
        if (docType) {
          this.documentType.set(docType);
          this.showDocumentModal.set(true);
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
      top_host: { color: 'text-warning-strong', icon: 'star' },
      super_host: { color: 'text-warning-strong', icon: 'award' },
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

  /**
   * Close document upload modal and clear query param
   */
  closeDocumentModal(): void {
    this.showDocumentModal.set(false);
    this.documentType.set(null);
    // Remove query param from URL without navigation
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
  }

  /**
   * Handle document uploaded successfully
   */
  onDocumentUploaded(): void {
    // Reload documents to update status
    void this.verificationService.loadDocuments();
  }
}
