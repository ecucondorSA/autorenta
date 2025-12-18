import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReferralsService } from '../../../core/services/referrals.service';

/**
 * ReferralBannerComponent
 *
 * Displays user's referral code and basic stats for sharing.
 * Provides copy-to-clipboard functionality for code and link.
 *
 * @example
 * ```html
 * <app-referral-banner />
 * ```
 */
@Component({
  selector: 'app-referral-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-5 text-white shadow-lg">
      <!-- Header -->
      <div class="text-center mb-4">
        <h3 class="font-bold text-lg mb-1">Invita y Gana</h3>
        <p class="text-xs text-gray-400">
          Compartí tu código con amigos y ganá recompensas
        </p>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="animate-pulse">
          <div class="h-12 bg-gray-700 rounded-lg mb-4"></div>
          <div class="flex gap-4 justify-center">
            <div class="h-6 w-20 bg-gray-700 rounded"></div>
            <div class="h-6 w-20 bg-gray-700 rounded"></div>
          </div>
        </div>
      }

      <!-- Content -->
      @if (!loading() && referralCode()) {
        <!-- Code Display -->
        <div
          class="bg-gray-800 p-3 rounded-lg border border-dashed border-gray-600 mb-4 cursor-pointer hover:border-yellow-400 transition-colors group"
          (click)="copyCode()"
          role="button"
          [attr.aria-label]="'Copiar código ' + referralCode()!.code"
        >
          <div class="flex items-center justify-center gap-2">
            <span class="font-mono text-lg tracking-widest text-yellow-400">
              {{ referralCode()!.code }}
            </span>
            <svg
              class="w-4 h-4 text-gray-400 group-hover:text-yellow-400 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p class="text-[10px] text-gray-500 text-center mt-1">
            @if (copiedCode()) {
              <span class="text-green-400">Copiado!</span>
            } @else {
              Click para copiar
            }
          </p>
        </div>

        <!-- Stats -->
        @if (stats()) {
          <div class="flex items-center justify-center gap-6 text-center">
            <div>
              <div class="text-xl font-bold text-white">{{ stats()!.total_referrals }}</div>
              <div class="text-[10px] text-gray-400 uppercase tracking-wide">Referidos</div>
            </div>
            <div class="w-px h-8 bg-gray-700"></div>
            <div>
              <div class="text-xl font-bold text-green-400">
                {{ totalEarned() | number:'1.0-0' }}
              </div>
              <div class="text-[10px] text-gray-400 uppercase tracking-wide">Ganado</div>
            </div>
          </div>
        }

        <!-- Share Link Button -->
        @if (shareableLink()) {
          <button
            (click)="copyLink()"
            class="w-full mt-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
          >
            @if (copiedLink()) {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Link Copiado!
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Compartir Link
            }
          </button>
        }
      }

      <!-- No Code Yet -->
      @if (!loading() && !referralCode()) {
        <div class="text-center py-4">
          <p class="text-sm text-gray-400 mb-3">
            Genera tu código de referido para empezar a ganar
          </p>
          <button
            (click)="generateCode()"
            [disabled]="generating()"
            class="bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-600 text-gray-900 font-bold py-2 px-6 rounded-lg text-sm transition-colors"
          >
            @if (generating()) {
              <span class="flex items-center gap-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Generando...
              </span>
            } @else {
              Generar Código
            }
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
  `],
})
export class ReferralBannerComponent implements OnInit {
  private readonly referralsService = inject(ReferralsService);

  readonly loading = signal(true);
  readonly generating = signal(false);
  readonly copiedCode = signal(false);
  readonly copiedLink = signal(false);

  // Expose service signals
  readonly referralCode = this.referralsService.myReferralCode;
  readonly stats = this.referralsService.myStats;
  readonly shareableLink = this.referralsService.shareableLink;
  readonly totalEarned = this.referralsService.totalEarned;

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      // Load existing referral code if any
      await this.referralsService.getOrCreateMyReferralCode();
      await this.referralsService.getMyStats();
    } catch (error) {
      // User might not have a code yet, which is fine
      console.debug('No referral code yet:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async generateCode(): Promise<void> {
    this.generating.set(true);
    try {
      await this.referralsService.getOrCreateMyReferralCode();
      await this.referralsService.getMyStats();
    } catch (error) {
      console.error('Error generating referral code:', error);
    } finally {
      this.generating.set(false);
    }
  }

  async copyCode(): Promise<void> {
    const code = this.referralCode();
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code.code);
      this.copiedCode.set(true);
      setTimeout(() => this.copiedCode.set(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }

  async copyLink(): Promise<void> {
    const link = this.shareableLink();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      this.copiedLink.set(true);
      setTimeout(() => this.copiedLink.set(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  }
}
