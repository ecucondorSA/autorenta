import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-splash-loader',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  styles: [`
    :host { display: contents; }

    /* Prefer reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .motion-ok { animation: none !important; }
      .video-bg { display: none !important; }
      .splash-container {
        background-image: url('/assets/images/splash-background-poster.jpg');
        background-size: cover;
        background-position: center;
      }
    }

    /* Custom keyframes for subtle bobbing of the logo */
    @keyframes bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    /* Video background styling */
    .video-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      animation: fadeIn 0.8s ease-in;
    }

    .overlay {
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.28) 0%,
        rgba(0, 0, 0, 0.48) 45%,
        rgba(0, 0, 0, 0.68) 100%
      );
      backdrop-filter: blur(3px);
    }

    .logo-image {
      filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.55));
    }

    .tagline {
      text-shadow: 0 6px 22px rgba(0, 0, 0, 0.65);
      color: #f5efe6;
    }

    .progress-track {
      background: rgba(255, 255, 255, 0.25);
    }

    .progress-fill {
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 216, 145, 0.95) 100%);
    }
  `],
  template: `
    <div class="fixed inset-0 z-[9999] overflow-hidden splash-container">
      <!-- Video Background -->
      <video
        #videoElement
        class="video-bg"
        autoplay
        muted
        loop
        playsinline
        webkit-playsinline
        preload="auto"
        [defaultMuted]="true"
        [muted]="true"
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        poster="/assets/images/splash-background-poster.jpg"
      >
        <source src="/assets/videos/splash-background-mobile.mp4" type="video/mp4" media="(max-aspect-ratio: 3/4)">
        <source src="/assets/videos/splash-background.webm" type="video/webm">
        <source src="/assets/videos/splash-background.mp4" type="video/mp4">
      </video>

      <!-- Dark Overlay -->
      <div class="overlay absolute inset-0"></div>

      <!-- Content Over Video -->
      <div class="relative z-10 h-full flex flex-col items-center justify-center gap-8 text-white">
        <!-- Logo/Wordmark -->
        <div class="flex items-center justify-center h-28 motion-ok" style="animation: bob 2s ease-in-out infinite;">
          <img
            src="/assets/images/autorentar-logo.png"
            alt="Autorentar"
            class="logo-image h-full w-auto object-contain scale-[4.2]"
          />
        </div>

        <!-- Tagline / helpful text -->
        <div class="text-center px-6 motion-ok tagline" style="animation: pulse 2s ease-in-out infinite;">
          <p class="text-[1.35rem] md:text-2xl font-light tracking-[0.15em] uppercase">
            Prendiendo los motores...
          </p>
        </div>

        <!-- Loading bar -->
        <div class="progress-track w-56 md:w-64 h-1.5 rounded-full overflow-hidden mt-6">
          <div class="progress-fill h-full rounded-full motion-ok" style="animation: loadingBar 4s ease-in-out infinite;"></div>
        </div>
      </div>
    </div>

    <style>
      @keyframes loadingBar {
        0% { width: 0%; }
        100% { width: 100%; }
      }
    </style>
  `
})
export class SplashLoaderComponent implements AfterViewInit {
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

  ngAfterViewInit(): void {
    // Aggressive autoplay for iOS Safari
    if (this.videoElement?.nativeElement) {
      const video = this.videoElement.nativeElement;

      // Critical: Ensure muted for autoplay (iOS requirement)
      video.muted = true;
      video.playsInline = true;
      video.playbackRate = 1.3;

      // Attempt 1: Play immediately (video should be preloaded from index.html)
      this.attemptPlay(video, 1);
    }
  }

  private attemptPlay(video: HTMLVideoElement, attempt: number): void {
    const playPromise = video.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log(`🎬 Splash video autoplay SUCCESS (attempt ${attempt})`);
        })
        .catch(err => {
          console.warn(`⚠️ Autoplay attempt ${attempt} failed:`, err.name);

          // Attempt 2: Retry after 100ms (video might still be loading)
          if (attempt === 1) {
            setTimeout(() => this.attemptPlay(video, 2), 100);
            return;
          }

          // Attempt 3: Retry after 500ms
          if (attempt === 2) {
            setTimeout(() => this.attemptPlay(video, 3), 500);
            return;
          }

          // Final fallback: Play on first user interaction
          console.warn('🚫 All autoplay attempts failed. Waiting for user interaction...');
          const playOnInteraction = () => {
            video.play()
              .then(() => console.log('🎬 Video played after user interaction'))
              .catch(() => console.error('❌ Video play failed even after interaction'));
          };

          document.addEventListener('touchstart', playOnInteraction, { once: true, passive: true });
          document.addEventListener('click', playOnInteraction, { once: true });
        });
    }
  }
}
