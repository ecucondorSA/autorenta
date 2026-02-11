import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Input,
  OnInit,
  signal,
} from '@angular/core';
import { FeatureDataFacadeService } from '@core/services/facades/feature-data-facade.service';
import { SessionFacadeService } from '@core/services/facades/session-facade.service';
import { IdentityLevelService } from '@core/services/verification/identity-level.service';

type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';
type BadgeVariant = 'default' | 'minimal' | 'detailed';

interface OwnerCarIdRow {
  id: string;
}

interface VehicleDocumentStatusRow {
  green_card_verified_at: string | null;
  vtv_verified_at: string | null;
  vtv_expiry: string | null;
  insurance_verified_at: string | null;
  insurance_expiry: string | null;
}

/**
 * Verified Badge Component
 *
 * Professional badge to display user verification status.
 * Inspired by Airbnb/Uber trust badges.
 *
 * Usage:
 * <app-verified-badge />
 * <app-verified-badge size="lg" variant="detailed" />
 * <app-verified-badge [level]="3" [showTooltip]="true" />
 */
@Component({
  selector: 'app-verified-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shouldShow()) {
      <div
        class="verified-badge inline-flex items-center gap-1.5 select-none"
        [class]="containerClass()"
        [title]="showTooltip ? tooltipText() : ''"
        role="img"
        [attr.aria-label]="ariaLabel()"
      >
        <!-- Shield Icon with Check -->
        <div [class]="iconContainerClass()">
          @if (currentLevel() >= 3) {
            <!-- Level 3: Locador Senior - Gold crown + shield -->
            <svg
              [class]="iconClass()"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <!-- Crown -->
              <path
                d="M5 16L3 8L7.5 11L12 6L16.5 11L21 8L19 16H5Z"
                fill="currentColor"
                class="text-amber-400"
              />
              <!-- Shield base -->
              <path
                d="M6 16V18C6 19.1 6.9 20 8 20H16C17.1 20 18 19.1 18 18V16H6Z"
                fill="currentColor"
                class="text-amber-500"
              />
              <!-- Star in center -->
              <path
                d="M12 9L12.9 11.8H15.8L13.4 13.5L14.3 16.3L12 14.6L9.7 16.3L10.6 13.5L8.2 11.8H11.1L12 9Z"
                fill="white"
              />
            </svg>
          } @else if (currentLevel() >= 2) {
            <!-- Level 2: Identity Verified - Blue shield with check -->
            <svg
              [class]="iconClass()"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L4 5.5V11.5C4 16.19 7.4 20.56 12 22C16.6 20.56 20 16.19 20 11.5V5.5L12 2Z"
                fill="currentColor"
                class="text-blue-500"
              />
              <path
                d="M9.5 12.5L11 14L14.5 10.5"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          } @else {
            <!-- Level 1: Basic verification - Gray shield outline -->
            <svg
              [class]="iconClass()"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L4 5.5V11.5C4 16.19 7.4 20.56 12 22C16.6 20.56 20 16.19 20 11.5V5.5L12 2Z"
                stroke="currentColor"
                stroke-width="1.5"
                fill="none"
                class="text-gray-400"
              />
              <circle cx="12" cy="12" r="2" fill="currentColor" class="text-gray-400" />
            </svg>
          }
        </div>

        <!-- Label -->
        @if (variant !== 'minimal') {
          <span [class]="labelClass()">
            @if (variant === 'detailed') {
              {{ detailedLabel() }}
            } @else {
              {{ shortLabel() }}
            }
          </span>
        }

        <!-- Level indicator for detailed variant -->
        @if (variant === 'detailed' && currentLevel() >= 2) {
          <span [class]="levelBadgeClass()"> L{{ currentLevel() }} </span>
        }
      </div>
    }
  `,
  styles: [
    `
      .verified-badge {
        transition: all 0.2s ease;
      }

      .verified-badge:hover {
        transform: scale(1.02);
      }

      @keyframes badge-shine {
        0% {
          opacity: 0;
          transform: translateX(-100%);
        }
        50% {
          opacity: 0.5;
        }
        100% {
          opacity: 0;
          transform: translateX(100%);
        }
      }

      .badge-shine::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        animation: badge-shine 2s ease-in-out infinite;
      }
    `,
  ],
})
export class VerifiedBadgeComponent implements OnInit {
  private readonly identityLevelService = inject(IdentityLevelService);
  private readonly sessionFacade = inject(SessionFacadeService);
  private readonly featureDataFacade = inject(FeatureDataFacadeService);

  /** Override level (optional - defaults to current user's level) */
  @Input() level?: number;

  /** Badge size */
  @Input() size: BadgeSize = 'sm';

  /** Badge variant */
  @Input() variant: BadgeVariant = 'default';

  /** Show tooltip on hover */
  @Input() showTooltip = true;

  /** Minimum level to show badge (default: 1) */
  @Input() minLevel = 1;

  /** Show even if not verified */
  @Input() showUnverified = false;

  /** User ID to check (optional - defaults to current user) */
  @Input() userId?: string;

  private readonly _level = signal<number | undefined>(undefined);
  private readonly _isLocadorSenior = signal(false);
  private readonly _verifiedCarsCount = signal(0);

  /** Number of cars with complete documentation */
  readonly verifiedCarsCount = this._verifiedCarsCount.asReadonly();

  readonly currentLevel = computed(() => {
    // If level is explicitly set, use it
    if (this._level() !== undefined) {
      return this._level()!;
    }

    const identityLevel = this.identityLevelService.currentLevel();

    // Level 3 "Locador Senior" requires:
    // - Identity Level 2+ (documents + selfie verified)
    // - At least 1 car with complete documentation
    if (identityLevel >= 2 && this._isLocadorSenior()) {
      return 3;
    }

    return identityLevel;
  });

  readonly shouldShow = computed(() => {
    const level = this.currentLevel();
    if (this.showUnverified) return true;
    return level >= this.minLevel;
  });

  readonly shortLabel = computed(() => {
    const level = this.currentLevel();
    if (level >= 3) return 'Locador Senior';
    if (level >= 2) return 'Verificado';
    if (level >= 1) return 'Básico';
    return 'Sin verificar';
  });

  readonly detailedLabel = computed(() => {
    const level = this.currentLevel();
    if (level >= 3) return 'Locador Senior';
    if (level >= 2) return 'Identidad Verificada';
    if (level >= 1) return 'Verificación Básica';
    return 'Sin verificar';
  });

  readonly tooltipText = computed(() => {
    const level = this.currentLevel();
    if (level >= 3) {
      return 'Locador Senior: Identidad verificada + Autos con documentación completa';
    }
    if (level >= 2) {
      return 'Usuario con documentos e identidad verificados (DNI, licencia y selfie)';
    }
    if (level >= 1) {
      return 'Usuario con verificación básica (email o teléfono)';
    }
    return 'Usuario sin verificar';
  });

  readonly ariaLabel = computed(() => {
    return `Nivel de verificación: ${this.detailedLabel()}`;
  });

  readonly containerClass = computed(() => {
    const classes: string[] = [];
    const level = this.currentLevel();

    // Background based on level
    if (level >= 3) {
      classes.push('bg-gradient-to-r from-amber-50 to-amber-100');
      classes.push('border border-amber-200');
    } else if (level >= 2) {
      classes.push('bg-gradient-to-r from-blue-50 to-blue-100');
      classes.push('border border-blue-200');
    } else {
      classes.push('bg-gray-50');
      classes.push('border border-gray-200');
    }

    // Size-based padding
    switch (this.size) {
      case 'xs':
        classes.push('px-1.5 py-0.5 rounded');
        break;
      case 'sm':
        classes.push('px-2 py-1 rounded-md');
        break;
      case 'md':
        classes.push('px-2.5 py-1.5 rounded-lg');
        break;
      case 'lg':
        classes.push('px-3 py-2 rounded-xl');
        break;
    }

    return classes.join(' ');
  });

  readonly iconContainerClass = computed(() => {
    const level = this.currentLevel();
    const classes: string[] = ['relative'];

    if (level >= 3) {
      classes.push('badge-shine');
    }

    return classes.join(' ');
  });

  readonly iconClass = computed(() => {
    switch (this.size) {
      case 'xs':
        return 'w-3 h-3';
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-5 h-5';
      case 'lg':
        return 'w-6 h-6';
    }
  });

  readonly labelClass = computed(() => {
    const level = this.currentLevel();
    const classes: string[] = ['font-medium whitespace-nowrap'];

    // Color based on level
    if (level >= 3) {
      classes.push('text-amber-700');
    } else if (level >= 2) {
      classes.push('text-blue-700');
    } else {
      classes.push('text-gray-600');
    }

    // Size-based text
    switch (this.size) {
      case 'xs':
        classes.push('text-[10px]');
        break;
      case 'sm':
        classes.push('text-xs');
        break;
      case 'md':
        classes.push('text-sm');
        break;
      case 'lg':
        classes.push('text-base');
        break;
    }

    return classes.join(' ');
  });

  readonly levelBadgeClass = computed(() => {
    const level = this.currentLevel();
    const classes: string[] = ['font-bold rounded-full', 'flex items-center justify-center'];

    // Color based on level
    if (level >= 3) {
      classes.push('bg-amber-500 text-white');
    } else if (level >= 2) {
      classes.push('bg-blue-500 text-white');
    } else {
      classes.push('bg-gray-400 text-white');
    }

    // Size
    switch (this.size) {
      case 'xs':
        classes.push('text-[8px] w-3 h-3');
        break;
      case 'sm':
        classes.push('text-[9px] w-4 h-4');
        break;
      case 'md':
        classes.push('text-[10px] w-5 h-5');
        break;
      case 'lg':
        classes.push('text-xs w-6 h-6');
        break;
    }

    return classes.join(' ');
  });

  ngOnInit(): void {
    if (this.level !== undefined) {
      this._level.set(this.level);
    } else {
      // Load current user's level and check for Locador Senior status
      this.loadVerificationStatus();
    }
  }

  /**
   * Load verification status including Locador Senior check
   */
  private async loadVerificationStatus(): Promise<void> {
    try {
      // Load identity level
      await this.identityLevelService.loadIdentityLevel();

      // Check for Locador Senior status (cars with complete documentation)
      await this.checkLocadorSeniorStatus();
    } catch {
      // Silently fail - will show default state
    }
  }

  /**
   * Check if user qualifies as "Locador Senior"
   * Requirements:
   * - Has at least 1 car
   * - At least 1 car has complete documentation (green_card + vtv + insurance verified)
   */
  private async checkLocadorSeniorStatus(): Promise<void> {
    try {
      // Get user ID
      let targetUserId = this.userId;
      if (!targetUserId) {
        const currentUserId = await this.sessionFacade.getCurrentUserId();
        if (!currentUserId) return;
        targetUserId = currentUserId;
      }

      // Get user's cars
      const cars = (await this.featureDataFacade.listOwnerCarsForDocuments(
        targetUserId,
      )) as unknown as OwnerCarIdRow[];
      if (!cars.length) {
        this._isLocadorSenior.set(false);
        this._verifiedCarsCount.set(0);
        return;
      }

      // Get vehicle documents for all cars
      const carIds = cars.map((c) => c.id);
      const docs = (await this.featureDataFacade.listVehicleDocumentsByCarIds(
        carIds,
      )) as unknown as VehicleDocumentStatusRow[];
      if (!docs.length) {
        this._isLocadorSenior.set(false);
        this._verifiedCarsCount.set(0);
        return;
      }

      // Count cars with complete and valid documentation
      const now = new Date();
      let verifiedCount = 0;

      for (const doc of docs) {
        const hasGreenCard = !!doc.green_card_verified_at;
        const hasVtv = !!doc.vtv_verified_at;
        const hasInsurance = !!doc.insurance_verified_at;

        // Check if VTV is not expired
        const vtvValid = !doc.vtv_expiry || new Date(doc.vtv_expiry) > now;
        // Check if insurance is not expired
        const insuranceValid = !doc.insurance_expiry || new Date(doc.insurance_expiry) > now;

        // Car is fully verified if has all docs and none expired
        if (hasGreenCard && hasVtv && hasInsurance && vtvValid && insuranceValid) {
          verifiedCount++;
        }
      }

      this._verifiedCarsCount.set(verifiedCount);
      this._isLocadorSenior.set(verifiedCount > 0);
    } catch (error) {
      console.error('Error checking Locador Senior status:', error);
      this._isLocadorSenior.set(false);
      this._verifiedCarsCount.set(0);
    }
  }
}
