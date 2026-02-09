import { Component, ChangeDetectionStrategy, DestroyRef, input, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-countdown-timer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex gap-2 font-mono font-bold text-slate-900" [class]="sizeClass()">
      <div class="flex flex-col items-center">
        <span class="bg-white px-2 py-1 rounded shadow-sm border border-slate-100 min-w-[2ch] text-center">
          {{ time().hours | number:'2.0-0' }}
        </span>
        <span class="text-[10px] text-slate-400 font-sans mt-0.5">H</span>
      </div>
      <span class="py-1">:</span>
      <div class="flex flex-col items-center">
        <span class="bg-white px-2 py-1 rounded shadow-sm border border-slate-100 min-w-[2ch] text-center">
          {{ time().minutes | number:'2.0-0' }}
        </span>
        <span class="text-[10px] text-slate-400 font-sans mt-0.5">M</span>
      </div>
      <span class="py-1">:</span>
      <div class="flex flex-col items-center">
        <span class="bg-white px-2 py-1 rounded shadow-sm border border-slate-100 min-w-[2ch] text-center">
          {{ time().seconds | number:'2.0-0' }}
        </span>
        <span class="text-[10px] text-slate-400 font-sans mt-0.5">S</span>
      </div>
    </div>
  `
})
export class CountdownTimerComponent {
  targetDate = input.required<string | Date | null>();
  size = input<'sm' | 'md' | 'lg'>('md');

  readonly time = signal({ hours: 0, minutes: 0, seconds: 0 });
  
  readonly sizeClass = computed(() => {
    switch (this.size()) {
      case 'sm': return 'text-sm';
      case 'lg': return 'text-xl';
      default: return 'text-base';
    }
  });

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const interval = setInterval(() => this.updateTime(), 1000);
    this.destroyRef.onDestroy(() => clearInterval(interval));

    // Initial update
    effect(() => this.updateTime());
  }

  private updateTime() {
    const target = this.targetDate();
    if (!target) return;

    const end = new Date(target).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) {
      this.time.set({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    this.time.set({ hours, minutes, seconds });
  }
}
