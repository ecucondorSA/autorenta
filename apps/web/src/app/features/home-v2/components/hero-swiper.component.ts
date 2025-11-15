import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
  PLATFORM_ID,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { GestureService, type SwipeEvent } from '../../../core/services/gesture.service';

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  cta: string;
  ctaAction: () => void;
  gradient: string;
}

/**
 * Hero Swiper Component V2
 * Full-screen swipeable hero carousel
 *
 * Features:
 * - Auto-play with pause on interaction
 * - Swipe navigation (touch + mouse)
 * - Progress indicators
 * - Smooth animations
 * - Lazy image loading
 * - Accessibility support
 */
@Component({
  selector: 'app-hero-swiper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="hero-swiper" #swiperContainer>
      <!-- Slides -->
      <div
        class="slides-container"
        [style.transform]="'translateX(' + slideOffset() + 'px)'"
        [style.transition]="isAnimating() ? 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'"
      >
        @for (slide of slides; track slide.id) {
          <div
            class="slide"
            [class.active]="currentIndex() === $index"
            [style.background]="slide.gradient"
          >
            <!-- Background Image with Parallax -->
            <div class="slide-bg">
              <img
                [src]="slide.image"
                [alt]="slide.title"
                [loading]="$index === 0 ? 'eager' : 'lazy'"
                class="slide-image"
              />
            </div>

            <!-- Content -->
            <div class="slide-content">
              <div class="content-wrapper">
                <h1 class="slide-title animate-in">
                  {{ slide.title }}
                </h1>
                <p class="slide-subtitle animate-in delay-100">
                  {{ slide.subtitle }}
                </p>
                <button (click)="slide.ctaAction()" class="cta-button animate-in delay-200">
                  {{ slide.cta }}
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M7.5 15L12.5 10L7.5 5"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Overlay Gradient -->
            <div class="slide-overlay"></div>
          </div>
        }
      </div>

      <!-- Navigation Dots -->
      <div class="navigation-dots">
        @for (slide of slides; track slide.id) {
          <button
            (click)="goToSlide($index)"
            [class.active]="currentIndex() === $index"
            [attr.aria-label]="'Ir a slide ' + ($index + 1)"
            class="dot"
          >
            <div class="dot-progress" [style.animation-duration]="autoPlayDelay + 'ms'"></div>
          </button>
        }
      </div>

      <!-- Swipe Indicator (first visit) -->
      @if (showSwipeHint()) {
        <div class="swipe-hint">
          <svg width="40" height="40" viewBox="0 0 40 40">
            <path
              d="M15 20L25 20M25 20L20 15M25 20L20 25"
              stroke="white"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Desliza para explorar</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .hero-swiper {
        position: relative;
        width: 100%;
        height: 100vh;
        height: 100dvh;
        overflow: hidden;
        background: linear-gradient(135deg, #a7d8f4 0%, #75bae4 100%);
      }

      .slides-container {
        display: flex;
        height: 100%;
        will-change: transform;
      }

      .slide {
        position: relative;
        flex-shrink: 0;
        width: 100vw;
        height: 100%;
        overflow: hidden;
      }

      .slide-bg {
        position: absolute;
        inset: 0;
        overflow: hidden;
      }

      .slide-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .slide.active .slide-image {
        transform: scale(1.05);
      }

      .slide-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          to top,
          rgba(0, 0, 0, 0.7) 0%,
          rgba(0, 0, 0, 0.3) 50%,
          rgba(0, 0, 0, 0.5) 100%
        );
      }

      .slide-content {
        position: relative;
        z-index: 10;
        display: flex;
        align-items: flex-end;
        height: 100%;
        padding: env(safe-area-inset-bottom, 24px) 24px;
        padding-bottom: calc(env(safe-area-inset-bottom, 24px) + 100px);
      }

      .content-wrapper {
        width: 100%;
        max-width: 600px;
      }

      .slide-title {
        font-size: clamp(2rem, 8vw, 3.5rem);
        font-weight: 800;
        color: white;
        margin: 0 0 16px 0;
        line-height: 1.1;
        text-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
      }

      .slide-subtitle {
        font-size: clamp(1rem, 4vw, 1.25rem);
        color: rgba(255, 255, 255, 0.95);
        margin: 0 0 32px 0;
        line-height: 1.5;
        text-shadow: 0 1px 10px rgba(0, 0, 0, 0.3);
      }

      .cta-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 16px 32px;
        font-size: 1.125rem;
        font-weight: 600;
        color: #050505;
        background: white;
        border: none;
        border-radius: 50px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .cta-button:active {
        transform: scale(0.95);
      }

      .cta-button svg {
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .cta-button:hover svg {
        transform: translateX(4px);
      }

      /* Animations */
      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .slide.active .animate-in {
        animation: slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }

      .slide.active .delay-100 {
        animation-delay: 0.1s;
        opacity: 0;
      }

      .slide.active .delay-200 {
        animation-delay: 0.2s;
        opacity: 0;
      }

      /* Navigation Dots */
      .navigation-dots {
        position: absolute;
        bottom: calc(env(safe-area-inset-bottom, 24px) + 40px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 20;
        display: flex;
        gap: 12px;
      }

      .dot {
        position: relative;
        width: 8px;
        height: 8px;
        padding: 0;
        background: rgba(255, 255, 255, 0.4);
        border: none;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
      }

      .dot:active {
        transform: scale(0.9);
      }

      .dot.active {
        width: 32px;
        background: white;
        border-radius: 4px;
      }

      .dot-progress {
        position: absolute;
        inset: 0;
        background: rgba(255, 255, 255, 0.5);
        transform: scaleX(0);
        transform-origin: left;
      }

      .dot.active .dot-progress {
        animation: progress linear forwards;
      }

      @keyframes progress {
        from {
          transform: scaleX(0);
        }
        to {
          transform: scaleX(1);
        }
      }

      /* Swipe Hint */
      .swipe-hint {
        position: absolute;
        bottom: calc(env(safe-area-inset-bottom, 24px) + 120px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 20;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        color: white;
        font-size: 0.875rem;
        animation: swipeHintBounce 2s ease-in-out infinite;
      }

      @keyframes swipeHintBounce {
        0%,
        100% {
          transform: translateX(-50%) translateY(0);
        }
        50% {
          transform: translateX(-50%) translateY(-10px);
        }
      }

      /* Responsive */
      @media (min-width: 768px) {
        .slide-content {
          align-items: center;
          padding-bottom: 24px;
        }

        .content-wrapper {
          text-align: center;
        }

        .cta-button {
          padding: 18px 40px;
          font-size: 1.25rem;
        }
      }
    `,
  ],
})
export class HeroSwiperComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('swiperContainer') swiperContainer!: ElementRef<HTMLElement>;

  private gestureService = inject(GestureService);
  private platformId = inject(PLATFORM_ID);
  private cleanupGesture?: () => void;
  private autoPlayTimer?: any;

  // State
  currentIndex = signal(0);
  slideOffset = signal(0);
  isAnimating = signal(false);
  showSwipeHint = signal(true);

  // Configuration
  autoPlayDelay = 5000; // 5 seconds
  slideWidth = 0;

  slides: HeroSlide[] = [
    {
      id: '1',
      title: 'Alquila el auto perfecto',
      subtitle: 'Miles de vehículos disponibles cerca de ti',
      image:
        'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200&auto=format&fit=crop',
      cta: 'Explorar autos',
      ctaAction: () => console.log('Navigate to /cars'),
      gradient: 'linear-gradient(135deg, #A7D8F4 0%, #75BAE4 100%)',
    },
    {
      id: '2',
      title: 'Gana dinero con tu auto',
      subtitle: 'Comparte tu vehículo cuando no lo uses',
      image:
        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&auto=format&fit=crop',
      cta: 'Publica tu auto',
      ctaAction: () => console.log('Navigate to /publish'),
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      id: '3',
      title: 'Viaja con confianza',
      subtitle: 'Seguro incluido en cada alquiler',
      image:
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&auto=format&fit=crop',
      cta: 'Ver más',
      ctaAction: () => console.log('Navigate to /insurance'),
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
  ];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Hide swipe hint after 3 seconds
    setTimeout(() => this.showSwipeHint.set(false), 3000);
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.slideWidth = window.innerWidth;

    // Setup swipe gesture
    this.cleanupGesture = this.gestureService.onSwipe(
      this.swiperContainer.nativeElement,
      (event: SwipeEvent) => this.handleSwipe(event),
    );

    // Start autoplay
    this.startAutoPlay();

    // Update slide width on resize
    window.addEventListener('resize', this.handleResize);
  }

  ngOnDestroy(): void {
    this.cleanupGesture?.();
    this.stopAutoPlay();
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.handleResize);
    }
  }

  private handleResize = (): void => {
    this.slideWidth = window.innerWidth;
    this.slideOffset.set(-this.currentIndex() * this.slideWidth);
  };

  private handleSwipe(event: SwipeEvent): void {
    this.stopAutoPlay(); // Stop autoplay on user interaction

    if (event.direction === 'left') {
      this.nextSlide();
    } else if (event.direction === 'right') {
      this.prevSlide();
    }

    // Restart autoplay after 2 seconds
    setTimeout(() => this.startAutoPlay(), 2000);
  }

  nextSlide(): void {
    if (this.isAnimating()) return;

    const nextIndex = (this.currentIndex() + 1) % this.slides.length;
    this.goToSlide(nextIndex);
  }

  prevSlide(): void {
    if (this.isAnimating()) return;

    const prevIndex = this.currentIndex() === 0 ? this.slides.length - 1 : this.currentIndex() - 1;
    this.goToSlide(prevIndex);
  }

  goToSlide(index: number): void {
    if (index === this.currentIndex()) return;

    this.isAnimating.set(true);
    this.currentIndex.set(index);
    this.slideOffset.set(-index * this.slideWidth);

    setTimeout(() => this.isAnimating.set(false), 400);
  }

  private startAutoPlay(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.stopAutoPlay();
    this.autoPlayTimer = setInterval(() => {
      this.nextSlide();
    }, this.autoPlayDelay);
  }

  private stopAutoPlay(): void {
    if (this.autoPlayTimer) {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = undefined;
    }
  }
}
