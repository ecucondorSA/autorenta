import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss']
})
export class SplashComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('splashVideo') splashVideo!: ElementRef<HTMLVideoElement>;

  isVisible = true;
  shouldHide = false;
  private timeoutId: any;

  ngAfterViewInit() {
    if (this.splashVideo?.nativeElement) {
      this.splashVideo.nativeElement.muted = true; // Ensure muted for autoplay policy
      this.splashVideo.nativeElement.play().catch(err => {
        console.error('Splash video autoplay failed:', err);
      });
    }
  }

  ngOnInit() {
    // Prevent scrolling while splash is visible
    document.body.style.overflow = 'hidden';

    // Start fade out after 3.5 seconds (adjust based on video length)
    this.timeoutId = setTimeout(() => {
      this.startExit();
    }, 3500);
  }

  startExit() {
    this.shouldHide = true;
    document.body.style.overflow = ''; // Restore scrolling

    // Remove from DOM after animation
    setTimeout(() => {
      this.isVisible = false;
    }, 500); // Match CSS transition duration
  }

  ngOnDestroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    document.body.style.overflow = '';
  }
}
