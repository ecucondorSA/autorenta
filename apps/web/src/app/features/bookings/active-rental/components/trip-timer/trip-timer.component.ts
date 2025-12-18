import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';

@Component({
  selector: 'app-trip-timer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './trip-timer.component.html',
})
export class TripTimerComponent implements OnInit, OnDestroy {
  @Input() startDate: Date | null = null;
  @Input() endDate: Date | null = null;

  private intervalId: number | null = null;

  // State
  readonly now = signal(new Date());

  // Computed
  readonly totalDuration = computed(() => {
    if (!this.startDate || !this.endDate) return 0;
    return this.endDate.getTime() - this.startDate.getTime();
  });

  readonly elapsed = computed(() => {
    if (!this.startDate) return 0;
    return Math.max(0, this.now().getTime() - this.startDate.getTime());
  });

  readonly remaining = computed(() => {
    if (!this.endDate) return 0;
    return Math.max(0, this.endDate.getTime() - this.now().getTime());
  });

  readonly progress = computed(() => {
    const total = this.totalDuration();
    if (total === 0) return 0;
    return Math.min(100, (this.elapsed() / total) * 100);
  });

  readonly timeRemaining = computed(() => {
    const ms = this.remaining();
    if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  });

  readonly isUrgent = computed(() => {
    // Less than 2 hours remaining
    return this.remaining() < 2 * 60 * 60 * 1000 && this.remaining() > 0;
  });

  readonly isOverdue = computed(() => {
    return this.remaining() <= 0;
  });

  ngOnInit(): void {
    // Update every second
    this.intervalId = window.setInterval(() => {
      this.now.set(new Date());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
  }

  padZero(num: number): string {
    return num.toString().padStart(2, '0');
  }
}
