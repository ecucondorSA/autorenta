import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash-loader',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host { display: contents; }

    /* Prefer reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .motion-ok { animation: none !important; }
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
        rgba(0, 0, 0, 0.3) 0%,
        rgba(0, 0, 0, 0.5) 50%,
        rgba(0, 0, 0, 0.7) 100%
      );
    }
  `],
  template: `
    <div class="fixed inset-0 z-[9999] overflow-hidden">
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
      >
        <source src="/assets/videos/splash-background.mp4" type="video/mp4">
      </video>

      <!-- Dark Overlay -->
      <div class="overlay absolute inset-0"></div>

      <!-- Content Over Video -->
      <div class="relative z-10 h-full flex flex-col items-center justify-center gap-8 text-white">
        <!-- Logo/Wordmark -->
        <div class="flex items-center justify-center h-32 motion-ok" style="animation: bob 2s ease-in-out infinite;">
          <img
            src="/assets/images/autorentar-logo.png"
            alt="Autorentar"
            class="h-full w-auto object-contain scale-[5] drop-shadow-2xl"
          />
        </div>

        <!-- Tagline / helpful text -->
        <div class="text-center px-6 motion-ok" style="animation: pulse 2s ease-in-out infinite;">
          <p class="text-xl md:text-2xl font-light tracking-wide drop-shadow-lg">
            Prendiendo los motores...
          </p>
        </div>

        <!-- Loading bar -->
        <div class="w-64 h-1 bg-white/20 rounded-full overflow-hidden mt-4">
          <div class="h-full bg-white/90 rounded-full motion-ok" style="animation: loadingBar 4s ease-in-out infinite;"></div>
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
