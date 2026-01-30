import {
  Component,
  input,
  output,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';

/**
 * Celebration component shown after successful publish
 * Features confetti animation and success message
 */
@Component({
  selector: 'app-celebration',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <!-- Confetti container -->
      <div class="confetti-container">
        @for (piece of confettiPieces; track $index) {
          <div
            class="confetti"
            [style.left.%]="piece.left"
            [style.animation-delay.ms]="piece.delay"
            [style.background-color]="piece.color"
          ></div>
        }
      </div>

      <!-- Content card -->
      <div class="relative z-10 bg-surface-raised rounded-3xl p-8 sm:p-12 shadow-2xl max-w-md mx-4 text-center animate-scale-in">
        <!-- Success icon -->
        <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce-in">
          <svg
            class="w-12 h-12 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <!-- Title -->
        <h2 class="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
          ¡Tu auto está publicado!
        </h2>

        <!-- Subtitle -->
        <p class="text-text-secondary mb-8">
          Ya podés empezar a recibir reservas. Te notificaremos cuando alguien esté interesado.
        </p>

        <!-- Car info -->
        @if (carTitle()) {
          <div class="bg-surface-secondary rounded-xl p-4 mb-8">
            <p class="text-sm text-text-muted mb-1">Tu publicación</p>
            <p class="font-semibold text-text-primary">{{ carTitle() }}</p>
          </div>
        }

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            (click)="viewListing.emit()"
            class="flex-1 px-6 py-3 bg-cta-default text-white font-semibold rounded-xl shadow-lg shadow-cta-default/30 hover:bg-cta-hover transition-all hover:scale-105"
          >
            Ver mi publicación
          </button>
          <button
            type="button"
            (click)="publishAnother.emit()"
            class="flex-1 px-6 py-3 border border-border-default text-text-primary font-semibold rounded-xl hover:bg-surface-secondary transition-all"
          >
            Publicar otro
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .confetti-container {
        position: fixed;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
      }

      .confetti {
        position: absolute;
        top: -10px;
        width: 10px;
        height: 10px;
        border-radius: 2px;
        animation: confetti-fall 3s ease-out forwards;
      }

      @keyframes confetti-fall {
        0% {
          transform: translateY(0) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(720deg);
          opacity: 0;
        }
      }

      .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
      }

      .animate-scale-in {
        animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .animate-bounce-in {
        animation: bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes bounceIn {
        0% {
          opacity: 0;
          transform: scale(0.3);
        }
        50% {
          opacity: 1;
          transform: scale(1.1);
        }
        70% {
          transform: scale(0.9);
        }
        100% {
          transform: scale(1);
        }
      }
    `,
  ],
})
export class CelebrationComponent implements OnInit {
  readonly carTitle = input<string | null>(null);
  readonly carId = input<string | null>(null);

  readonly viewListing = output<void>();
  readonly publishAnother = output<void>();

  confettiPieces: Array<{ left: number; delay: number; color: string }> = [];

  private readonly colors = [
    '#00d95f', // green
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#00bf54', // autorenta green hover
    '#8b5cf6', // violet
    '#10b981', // emerald
  ];

  ngOnInit(): void {
    this.createConfetti();
    this.triggerHapticFeedback();
  }

  private createConfetti(): void {
    const pieces: Array<{ left: number; delay: number; color: string }> = [];

    for (let i = 0; i < 50; i++) {
      pieces.push({
        left: Math.random() * 100,
        delay: Math.random() * 1000,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
      });
    }

    this.confettiPieces = pieces;
  }

  private triggerHapticFeedback(): void {
    // Try to trigger haptic feedback on mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
    }
  }
}
