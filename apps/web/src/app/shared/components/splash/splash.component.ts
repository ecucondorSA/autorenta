import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  Output,
  PLATFORM_ID,
  ViewChild,
  signal,
} from '@angular/core';

/**
 * Smart Splash Screen Component
 *
 * Features:
 * - Intro animation + seamless loop while app initializes
 * - Controlled by parent via `appReady` input
 * - Respects prefers-reduced-motion
 * - Graceful fallback for autoplay failures
 * - Emits `dismissed` when splash finishes
 */
@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplashComponent implements AfterViewInit, OnDestroy {
  @ViewChild('splashVideo') splashVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('loopVideo') loopVideo?: ElementRef<HTMLVideoElement>;

  /**
   * When true, splash will begin exit animation
   * Parent sets this when critical initialization completes
   */
  @Input() set appReady(value: boolean) {
    if (value && !this.isExiting()) {
      this.startExit();
    }
  }

  /** Emitted when splash screen is fully dismissed */
  @Output() dismissed = new EventEmitter<void>();

  readonly isVisible = signal(true);
  readonly isExiting = signal(false);
  readonly showLoop = signal(false);
  readonly showBranding = signal(false);

  private readonly isBrowser: boolean;
  private introEnded = false;
  private exitRequested = false;
  private animationFrame?: number;

  // Timing constants
  private readonly INTRO_DURATION = 2000; // Video intro duration
  private readonly FADE_DURATION = 400;
  private readonly MIN_DISPLAY = 800; // Minimum time to show splash
  private readonly MAX_WAIT = 5000; // Maximum wait before forced exit

  private startTime = 0;
  private maxWaitTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      this.isVisible.set(false);
      return;
    }

    this.startTime = performance.now();

    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      this.quickExit();
      return;
    }

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    // Start video playback
    this.playIntroVideo();

    // Show branding after slight delay
    setTimeout(() => {
      this.showBranding.set(true);
      this.cdr.markForCheck();
    }, 300);

    // Safety timeout - force exit after MAX_WAIT
    this.maxWaitTimeout = setTimeout(() => {
      if (this.isVisible()) {
        console.warn('[Splash] Max wait exceeded, forcing exit');
        this.startExit();
      }
    }, this.MAX_WAIT);
  }

  /**
   * Called when intro video finishes playing
   * Transitions to loop state if app not ready
   */
  onIntroEnded(): void {
    this.introEnded = true;

    if (this.exitRequested) {
      // App was ready before intro finished - exit now
      this.performExit();
    } else {
      // App not ready yet - show loop
      this.transitionToLoop();
    }
  }

  /**
   * Begin exit sequence
   * If intro still playing, waits for it to finish
   */
  startExit(): void {
    this.exitRequested = true;

    const elapsed = performance.now() - this.startTime;
    const remaining = Math.max(0, this.MIN_DISPLAY - elapsed);

    if (remaining > 0) {
      // Wait minimum display time
      setTimeout(() => this.checkAndExit(), remaining);
    } else {
      this.checkAndExit();
    }
  }

  private checkAndExit(): void {
    if (this.introEnded) {
      this.performExit();
    }
    // If intro not ended, onIntroEnded() will handle exit
  }

  private performExit(): void {
    if (this.isExiting()) return;

    this.isExiting.set(true);
    this.cdr.markForCheck();

    // Restore body scroll
    document.body.style.overflow = '';

    // Wait for fade animation then remove from DOM
    setTimeout(() => {
      this.isVisible.set(false);
      this.dismissed.emit();
      this.cdr.markForCheck();
    }, this.FADE_DURATION);
  }

  /**
   * Skip animations entirely for reduced motion users
   */
  private quickExit(): void {
    document.body.style.overflow = '';
    this.isVisible.set(false);
    this.dismissed.emit();
  }

  /**
   * Play the intro video with autoplay
   */
  private playIntroVideo(): void {
    const video = this.splashVideo?.nativeElement;
    if (!video) {
      this.onIntroEnded();
      return;
    }

    video.muted = true;
    video.playsInline = true;

    video.play().catch(() => {
      // Autoplay failed - skip to exit
      console.warn('[Splash] Autoplay blocked, skipping splash');
      this.onIntroEnded();
    });
  }

  /**
   * Transition from intro to looping animation
   * Creates seamless visual continuity
   */
  private transitionToLoop(): void {
    this.showLoop.set(true);
    this.cdr.markForCheck();

    // Start subtle breathing animation on logo
    this.startBreathingAnimation();
  }

  /**
   * Subtle "breathing" animation for logo while waiting
   * Uses requestAnimationFrame for smooth 60fps
   */
  private startBreathingAnimation(): void {
    // CSS animation handles this - no JS needed
    // This method reserved for future WebGL effects if desired
  }

  ngOnDestroy(): void {
    if (this.maxWaitTimeout) {
      clearTimeout(this.maxWaitTimeout);
    }
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.isBrowser) {
      document.body.style.overflow = '';
    }
  }
}
