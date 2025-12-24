import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReferralsService } from '@core/services/auth/referrals.service';

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
    <div class="relative group">
      <!-- Animated gradient border -->
      <div class="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 rounded-2xl opacity-75 blur-sm group-hover:opacity-100 transition-opacity duration-500 animate-gradient-xy"></div>

      <!-- Main card with dark glassmorphism -->
      <div class="relative bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
        <!-- Top gradient line -->
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500"></div>

        <!-- Decorative sparkles -->
        <div class="absolute top-4 right-4 w-8 h-8 opacity-20">
          <svg fill="currentColor" class="text-yellow-400 animate-pulse" viewBox="0 0 24 24">
            <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z"/>
          </svg>
        </div>
        <div class="absolute bottom-4 left-4 w-6 h-6 opacity-10">
          <svg fill="currentColor" class="text-amber-400" viewBox="0 0 24 24">
            <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z"/>
          </svg>
        </div>

        <div class="p-5 text-white">
          <!-- Header -->
          <div class="text-center mb-5">
            <div class="flex items-center justify-center gap-2 mb-2">
              <div class="relative">
                <div class="absolute inset-0 bg-yellow-500/30 rounded-full blur-md animate-pulse"></div>
                <div class="relative w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg class="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <h3 class="font-bold text-xl bg-gradient-to-r from-yellow-200 via-amber-200 to-yellow-200 bg-clip-text text-transparent">
              Invita y Gana
            </h3>
            <p class="text-xs text-gray-400 mt-1">
              Compartí tu código con amigos y ganá recompensas
            </p>
          </div>

          <!-- Loading State with shimmer -->
          @if (loading()) {
            <div class="space-y-4">
              <div class="h-16 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-xl animate-shimmer bg-[length:200%_100%]"></div>
              <div class="flex gap-4 justify-center">
                <div class="h-12 w-24 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-lg animate-shimmer bg-[length:200%_100%]"></div>
                <div class="h-12 w-24 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-lg animate-shimmer bg-[length:200%_100%]"></div>
              </div>
            </div>
          }

          <!-- Content -->
          @if (!loading() && referralCode()) {
            <!-- Code Display -->
            <div
              class="relative overflow-hidden bg-gray-800/80 p-4 rounded-xl border-2 border-dashed border-gray-600 mb-5 cursor-pointer hover:border-yellow-400/70 transition-all duration-300 group/code"
              (click)="copyCode()"
              role="button"
              [attr.aria-label]="'Copiar código ' + referralCode()!.code"
            >
              <!-- Glow effect on hover -->
              <div class="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/5 to-yellow-500/0 opacity-0 group-hover/code:opacity-100 transition-opacity duration-300"></div>

              <div class="relative flex items-center justify-center gap-3">
                <span class="font-mono text-2xl tracking-[0.3em] font-bold bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
                  {{ referralCode()!.code }}
                </span>
                <div class="w-8 h-8 bg-gray-700/50 rounded-lg flex items-center justify-center group-hover/code:bg-yellow-500/20 transition-colors">
                  <svg
                    class="w-4 h-4 text-gray-400 group-hover/code:text-yellow-400 transition-colors"
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
              </div>
              <p class="text-xs text-gray-500 text-center mt-2">
                @if (copiedCode()) {
                  <span class="text-emerald-400 font-medium flex items-center justify-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Copiado al portapapeles!
                  </span>
                } @else {
                  Click para copiar tu código
                }
              </p>
            </div>

            <!-- Stats -->
            @if (stats()) {
              <div class="flex items-center justify-center gap-4 mb-5">
                <div class="flex-1 bg-gray-800/50 rounded-xl p-3 text-center border border-gray-700/50">
                  <div class="text-2xl font-bold text-white">{{ stats()!.total_referrals }}</div>
                  <div class="text-xs text-gray-400 uppercase tracking-wider font-medium">Referidos</div>
                </div>
                <div class="flex-1 bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 rounded-xl p-3 text-center border border-emerald-700/30">
                  <div class="text-2xl font-bold text-emerald-400">
                    <span class="text-sm">$</span>{{ totalEarned() | number:'1.0-0' }}
                  </div>
                  <div class="text-xs text-emerald-400/70 uppercase tracking-wider font-medium">Ganado</div>
                </div>
              </div>
            }

            <!-- Share Link Button -->
            @if (shareableLink()) {
              <button
                (click)="copyLink()"
                class="relative w-full overflow-hidden group/btn bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-gray-900 font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-yellow-500/25 hover:scale-[1.02]"
              >
                @if (copiedLink()) {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Link Copiado!</span>
                } @else {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Compartir Link de Referido</span>
                }
                <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
              </button>
            }
          }

          <!-- No Code Yet -->
          @if (!loading() && !referralCode()) {
            <div class="text-center py-6">
              <div class="relative w-16 h-16 mx-auto mb-4">
                <div class="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-full animate-pulse"></div>
                <div class="relative w-full h-full bg-gray-800 rounded-full flex items-center justify-center border border-gray-700">
                  <svg class="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <p class="text-sm text-gray-400 mb-4 max-w-xs mx-auto">
                Genera tu código de referido único y empezá a ganar con cada amigo que invites
              </p>
              <button
                (click)="generateCode()"
                [disabled]="generating()"
                class="relative overflow-hidden group/btn bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 disabled:from-gray-600 disabled:to-gray-700 text-gray-900 disabled:text-gray-400 font-bold py-3 px-8 rounded-xl text-sm transition-all duration-300 shadow-lg hover:shadow-yellow-500/25 disabled:shadow-none"
              >
                @if (generating()) {
                  <span class="flex items-center gap-2">
                    <div class="w-4 h-4 border-2 border-gray-500 border-t-gray-900 rounded-full animate-spin"></div>
                    Generando...
                  </span>
                } @else {
                  <span class="relative z-10 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z"/>
                    </svg>
                    Generar Mi Código
                  </span>
                  <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
                }
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    @keyframes gradient-xy {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .animate-gradient-xy {
      animation: gradient-xy 3s ease infinite;
      background-size: 200% 200%;
    }

    .animate-shimmer {
      animation: shimmer 2s ease-in-out infinite;
    }
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
