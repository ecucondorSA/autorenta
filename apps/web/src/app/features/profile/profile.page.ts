import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { WalletService } from '../../core/services/wallet.service';
import { ReviewsService } from '../../core/services/reviews.service';
import { UserProfile, Role, UserStats, Review } from '../../core/models';

import { UserBadgesComponent } from '../../shared/components/user-badges/user-badges.component';
import { ReviewCardComponent } from '../../shared/components/review-card/review-card.component';
import { PwaCapabilitiesComponent } from '../../shared/components/pwa-capabilities/pwa-capabilities.component';

@Component({
  standalone: true,
  selector: 'app-profile-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    UserBadgesComponent,
    ReviewCardComponent,
    PwaCapabilitiesComponent,
    TranslateModule,
  ],
  templateUrl: './profile.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly walletService = inject(WalletService);
  private readonly reviewsService = inject(ReviewsService);

  readonly profile = signal<UserProfile | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly uploadingAvatar = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly editMode = signal(false);
  readonly copiedWAN = signal(false);

  // Reviews and stats
  readonly userStats = signal<UserStats | null>(null);
  readonly reviewsAsOwner = signal<Review[]>([]);
  readonly reviewsAsRenter = signal<Review[]>([]);
  readonly reviewsLoading = signal(false);
  readonly showAllReviewsOwner = signal(false);
  readonly showAllReviewsRenter = signal(false);

  readonly userEmail = computed(() => this.authService.session$()?.user?.email ?? '');
  readonly avatarUrl = computed(() => this.profile()?.avatar_url ?? '');
  readonly canPublishCars = computed(() => {
    const role = this.profile()?.role;
    return role === 'owner' || role === 'both';
  });
  readonly canBookCars = computed(() => {
    const role = this.profile()?.role;
    return role === 'renter' || role === 'both';
  });

  // Wallet state
  readonly availableBalance = this.walletService.availableBalance;
  readonly withdrawableBalance = this.walletService.withdrawableBalance;
  readonly protectedCreditBalance = this.walletService.nonWithdrawableBalance;
  readonly lockedBalance = this.walletService.lockedBalance;
  readonly totalBalance = this.walletService.totalBalance;

  // Computed reviews for display
  readonly displayedReviewsAsOwner = computed(() => {
    const reviews = this.reviewsAsOwner();
    return this.showAllReviewsOwner() ? reviews : reviews.slice(0, 3);
  });

  readonly displayedReviewsAsRenter = computed(() => {
    const reviews = this.reviewsAsRenter();
    return this.showAllReviewsRenter() ? reviews : reviews.slice(0, 3);
  });

  readonly hasMoreReviewsOwner = computed(() => this.reviewsAsOwner().length > 3);
  readonly hasMoreReviewsRenter = computed(() => this.reviewsAsRenter().length > 3);

  readonly form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(3)]],
    role: ['renter' as Role, Validators.required],
    // Contact
    phone: [''],
    whatsapp: [''],
    // Driver License
    driver_license_number: [''],
    driver_license_country: [''],
    driver_license_expiry: [''],
    // Address
    address_line1: [''],
    address_line2: [''],
    city: [''],
    state: [''],
    postal_code: [''],
    country: [''],
  });

  readonly roles: { value: Role; label: string; description: string }[] = [
    {
      value: 'renter',
      label: 'Locatario',
      description: 'Solo quiero reservar autos',
    },
    {
      value: 'owner',
      label: 'Locador',
      description: 'Solo quiero publicar mis autos',
    },
    {
      value: 'both',
      label: 'Ambos',
      description: 'Quiero reservar y publicar autos',
    },
  ];

  ngOnInit(): void {
    void this.loadProfile();
    void this.walletService.getBalance().catch(() => {
      // Ignorar error si no se puede cargar el balance
    });
    void this.loadReviewsAndStats();
  }

  async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const profile = await this.profileService.getCurrentProfile();
      this.profile.set(profile);

      if (profile) {
        this.form.patchValue({
          full_name: profile.full_name,
          role: profile.role,
          phone: profile.phone ?? '',
          whatsapp: profile.whatsapp ?? '',
          driver_license_number: profile.driver_license_number ?? '',
          driver_license_country: profile.driver_license_country ?? '',
          driver_license_expiry: profile.driver_license_expiry ?? '',
          address_line1: profile.address_line1 ?? '',
          address_line2: profile.address_line2 ?? '',
          city: profile.city ?? '',
          state: profile.state ?? '',
          postal_code: profile.postal_code ?? '',
          country: profile.country ?? '',
        });
      }
    } catch (err) {

      // Get detailed error message
      let errorMessage = 'No pudimos cargar tu perfil.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        errorMessage = JSON.stringify(err);
      }

      // Provide more context based on error type
      if (errorMessage.includes('Usuario no autenticado')) {
        errorMessage = 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.';
      } else if (errorMessage.includes('RLS Policy')) {
        errorMessage = 'Error de permisos: ' + errorMessage;
      }

      this.error.set(errorMessage);
    } finally {
      this.loading.set(false);
    }
  }

  toggleEditMode(): void {
    if (this.editMode()) {
      // Cancelar edición - restaurar valores originales
      const profile = this.profile();
      if (profile) {
        this.form.patchValue({
          full_name: profile.full_name,
          role: profile.role,
          phone: profile.phone ?? '',
          whatsapp: profile.whatsapp ?? '',
          driver_license_number: profile.driver_license_number ?? '',
          driver_license_country: profile.driver_license_country ?? '',
          driver_license_expiry: profile.driver_license_expiry ?? '',
          address_line1: profile.address_line1 ?? '',
          address_line2: profile.address_line2 ?? '',
          city: profile.city ?? '',
          state: profile.state ?? '',
          postal_code: profile.postal_code ?? '',
          country: profile.country ?? '',
        });
      }
      this.editMode.set(false);
      this.message.set(null);
      this.error.set(null);
    } else {
      this.editMode.set(true);
    }
  }

  async saveProfile(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);

    try {
      const updates = this.form.getRawValue();
      const updatedProfile = await this.profileService.updateProfile(updates);
      this.profile.set(updatedProfile);
      this.editMode.set(false);
      this.message.set('Perfil actualizado exitosamente');

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => this.message.set(null), 3000);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No pudimos actualizar tu perfil.');
    } finally {
      this.saving.set(false);
    }
  }

  async onAvatarChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.uploadingAvatar.set(true);
    this.error.set(null);
    this.message.set(null);

    try {
      const newAvatarUrl = await this.profileService.uploadAvatar(file);

      // Actualizar perfil local
      const currentProfile = this.profile();
      if (currentProfile) {
        this.profile.set({
          ...currentProfile,
          avatar_url: newAvatarUrl,
        });
      }

      this.message.set('Avatar actualizado exitosamente');
      setTimeout(() => this.message.set(null), 3000);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No pudimos actualizar tu avatar.');
    } finally {
      this.uploadingAvatar.set(false);
      // Reset input
      input.value = '';
    }
  }

  async deleteAvatar(): Promise<void> {
    if (!confirm('¿Estás seguro de eliminar tu avatar?')) {
      return;
    }

    this.uploadingAvatar.set(true);
    this.error.set(null);

    try {
      await this.profileService.deleteAvatar();

      // Actualizar perfil local
      const currentProfile = this.profile();
      if (currentProfile) {
        this.profile.set({
          ...currentProfile,
          avatar_url: undefined,
        });
      }

      this.message.set('Avatar eliminado');
      setTimeout(() => this.message.set(null), 3000);
    } catch (err) {
      this.error.set('No pudimos eliminar tu avatar.');
    } finally {
      this.uploadingAvatar.set(false);
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch (err) {
      this.error.set('Error al cerrar sesión');
    }
  }

  async loadReviewsAndStats(): Promise<void> {
    this.reviewsLoading.set(true);

    try {
      const userId = this.authService.session$()?.user?.id;
      if (!userId) {
        return;
      }

      const [stats, reviewsAsOwner, reviewsAsRenter] = await Promise.all([
        this.reviewsService.getUserStats(userId),
        this.reviewsService.getReviewsForUser(userId, true), // as owner
        this.reviewsService.getReviewsForUser(userId, false), // as renter
      ]);

      this.userStats.set(stats);
      this.reviewsAsOwner.set(reviewsAsOwner);
      this.reviewsAsRenter.set(reviewsAsRenter);
    } catch (error) {
    } finally {
      this.reviewsLoading.set(false);
    }
  }

  toggleShowAllOwnerReviews(): void {
    this.showAllReviewsOwner.set(!this.showAllReviewsOwner());
  }

  toggleShowAllRenterReviews(): void {
    this.showAllReviewsRenter.set(!this.showAllReviewsRenter());
  }

  /**
   * Copia el Wallet Account Number al portapapeles
   */
  async copyWalletAccountNumber(): Promise<void> {
    const wan = this.profile()?.wallet_account_number;
    if (!wan) return;

    try {
      await navigator.clipboard.writeText(wan);
      this.copiedWAN.set(true);

      // Reset copied state after 2 seconds
      setTimeout(() => {
        this.copiedWAN.set(false);
      }, 2000);
    } catch (error) {
      this.error.set('Error al copiar el número de cuenta');
    }
  }
}
