import { Injectable, computed, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { UserProfile } from '@core/models';
import { AuthService } from '@core/services/auth/auth.service';
import type { UpdateProfileData } from '@core/services/auth/profile.service';
import { ProfileService } from '@core/services/auth/profile.service';
import { WalletService } from '@core/services/payments/wallet.service';

/**
 * ProfileStore - Centralized state management for user profile
 *
 * This store provides:
 * - Single source of truth for profile data
 * - Automatic cache invalidation after mutations
 * - Integration with WalletService for balances
 * - Idempotent methods for avatar, roles, and profile updates
 *
 * Usage:
 * ```typescript
 * constructor(private profileStore = inject(ProfileStore)) {}
 *
 * ngOnInit() {
 *   this.profileStore.loadProfile();
 * }
 *
 * // In template:
 * {{ profileStore.profile()?.full_name }}
 * {{ profileStore.avatarUrl() }}
 * {{ profileStore.canPublishCars() }}
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class ProfileStore {
  private readonly profileService = inject(ProfileService);
  private readonly walletService = inject(WalletService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  // ==================== CORE STATE ====================

  /**
   * Current user profile (null if not loaded or user not authenticated)
   */
  readonly profile = signal<UserProfile | null>(null);

  /**
   * Loading state for profile operations
   */
  readonly loading = signal(false);

  /**
   * Error state for profile operations
   */
  readonly error = signal<string | null>(null);

  /**
   * Uploading avatar state
   */
  readonly uploadingAvatar = signal(false);

  /**
   * Cache timestamp for invalidation
   */
  private cacheTimestamp = 0;
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  // ==================== COMPUTED VALUES ====================

  /**
   * Avatar URL (empty string if not set)
   */
  readonly avatarUrl = computed(() => this.profile()?.avatar_url ?? '');

  /**
   * User email from auth session
   */
  readonly userEmail = computed(() => this.authService.session$()?.user?.email ?? '');

  /**
   * User role
   */
  readonly role = computed(() => this.profile()?.role ?? 'renter');

  /**
   * Can publish cars (owner or both)
   */
  readonly canPublishCars = computed(() => {
    const role = this.profile()?.role;
    return role === 'owner' || role === 'both';
  });

  /**
   * Can book cars (renter or both)
   */
  readonly canBookCars = computed(() => {
    const role = this.profile()?.role;
    return role === 'renter' || role === 'both';
  });

  /**
   * Wallet account number
   */
  readonly walletAccountNumber = computed(() => this.profile()?.wallet_account_number ?? null);

  /**
   * Is profile loaded
   */
  readonly isLoaded = computed(() => this.profile() !== null);

  /**
   * Is profile loading
   */
  readonly isLoading = computed(() => this.loading());

  /**
   * Has error
   */
  readonly hasError = computed(() => this.error() !== null);

  // ==================== WALLET INTEGRATION ====================

  /**
   * Available balance (delegates to WalletService)
   */
  readonly availableBalance = this.walletService.availableBalance;

  /**
   * Withdrawable balance (delegates to WalletService)
   */
  readonly withdrawableBalance = this.walletService.withdrawableBalance;

  /**
   * Locked balance (delegates to WalletService)
   */
  readonly lockedBalance = this.walletService.lockedBalance;

  /**
   * Total balance (delegates to WalletService)
   */
  readonly totalBalance = this.walletService.totalBalance;

  /**
   * Protected credit balance (deprecated, for backward compatibility)
   */
  readonly protectedCreditBalance = this.walletService.protectedCreditBalance;

  /**
   * Autorentar credit balance
   */
  readonly autorentarCreditBalance = this.walletService.autorentarCreditBalance;

  /**
   * Cash deposit balance
   */
  readonly cashDepositBalance = this.walletService.cashDepositBalance;

  // ==================== METHODS ====================

  /**
   * Load profile from server (with cache check)
   */
  async loadProfile(force = false): Promise<UserProfile | null> {
    // Check cache if not forcing refresh
    if (!force && this.isCacheValid() && this.profile() !== null) {
      return this.profile();
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const profile = await this.profileService.getCurrentProfile();
      this.profile.set(profile);
      this.cacheTimestamp = Date.now();

      // Load wallet balance if profile loaded successfully
      if (profile) {
        this.walletService.getBalance()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            error: () => {
              // Ignore wallet errors - non-blocking
            },
          });
      }

      return profile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'No pudimos cargar tu perfil.';
      this.error.set(errorMessage);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Update profile with optimistic update
   */
  async updateProfile(updates: UpdateProfileData): Promise<UserProfile> {
    this.loading.set(true);
    this.error.set(null);

    // Optimistic update
    const currentProfile = this.profile();
    if (currentProfile) {
      this.profile.set({
        ...currentProfile,
        ...updates,
      } as UserProfile);
    }

    try {
      const updatedProfile = await this.profileService.updateProfile(updates);
      this.profile.set(updatedProfile);
      this.cacheTimestamp = Date.now();
      return updatedProfile;
    } catch (err) {
      // Rollback on error
      if (currentProfile) {
        this.profile.set(currentProfile);
      }
      const errorMessage = err instanceof Error ? err.message : 'No pudimos actualizar tu perfil.';
      this.error.set(errorMessage);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Update a specific profile section with analytics tracking
   *
   * @param sectionId - The section being updated (e.g., 'identity', 'contact', 'preferences')
   * @param updates - Partial profile data to update
   * @returns Updated profile
   *
   * This method provides:
   * - Section-specific error messages
   * - Analytics tracking for which sections are being edited
   * - Same optimistic update pattern as updateProfile()
   *
   * @example
   * ```typescript
   * await profileStore.updateSection('identity', {
   *   full_name: 'John Doe',
   *   date_of_birth: '1990-01-01'
   * });
   * ```
   */
  async updateSection(
    sectionId: string,
    updates: Partial<UpdateProfileData>,
  ): Promise<UserProfile> {
    this.loading.set(true);
    this.error.set(null);

    // TODO: Send analytics event for section update
    // this.analytics.track('profile_section_updating', {
    //   section_id: sectionId,
    //   fields: Object.keys(updates),
    // });

    // Optimistic update
    const currentProfile = this.profile();
    if (currentProfile) {
      this.profile.set({
        ...currentProfile,
        ...updates,
      } as UserProfile);
    }

    try {
      const updatedProfile = await this.profileService.updateProfile(updates);
      this.profile.set(updatedProfile);
      this.cacheTimestamp = Date.now();

      // TODO: Send analytics event
      // this.analytics.track('profile_section_updated', {
      //   section_id: sectionId,
      //   fields_updated: Object.keys(updates),
      // });

      return updatedProfile;
    } catch (err) {
      // Rollback on error
      if (currentProfile) {
        this.profile.set(currentProfile);
      }

      const errorMessage =
        err instanceof Error ? err.message : `No pudimos actualizar la sección "${sectionId}".`;

      this.error.set(errorMessage);

      // TODO: Send analytics event for error
      // this.analytics.track('profile_section_update_failed', {
      //   section_id: sectionId,
      //   error: errorMessage,
      // });

      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Upload avatar with optimistic update
   */
  async uploadAvatar(file: File): Promise<string> {
    this.uploadingAvatar.set(true);
    this.error.set(null);

    try {
      const newAvatarUrl = await this.profileService.uploadAvatar(file);

      // Update profile local state
      const currentProfile = this.profile();
      if (currentProfile) {
        this.profile.set({
          ...currentProfile,
          avatar_url: newAvatarUrl,
        });
        this.cacheTimestamp = Date.now();
      }

      return newAvatarUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'No pudimos actualizar tu avatar.';
      this.error.set(errorMessage);
      throw err;
    } finally {
      this.uploadingAvatar.set(false);
    }
  }

  /**
   * Delete avatar
   */
  async deleteAvatar(): Promise<void> {
    this.uploadingAvatar.set(true);
    this.error.set(null);

    try {
      await this.profileService.deleteAvatar();

      // Update profile local state
      const currentProfile = this.profile();
      if (currentProfile) {
        this.profile.set({
          ...currentProfile,
          avatar_url: undefined,
        });
        this.cacheTimestamp = Date.now();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'No pudimos eliminar tu avatar.';
      this.error.set(errorMessage);
      throw err;
    } finally {
      this.uploadingAvatar.set(false);
    }
  }

  /**
   * Invalidate cache and force reload
   */
  invalidateCache(): void {
    this.cacheTimestamp = 0;
  }

  /**
   * Refresh profile (force reload)
   */
  async refresh(): Promise<UserProfile | null> {
    return this.loadProfile(true);
  }

  /**
   * Clear profile state (useful for logout)
   */
  clear(): void {
    this.profile.set(null);
    this.error.set(null);
    this.cacheTimestamp = 0;
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION_MS;
  }
}
