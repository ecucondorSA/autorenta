import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { WaitlistService } from '../../../core/services/waitlist.service';

@Component({
  selector: 'app-waitlist-count',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1">
      <svg
        class="h-4 w-4 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span class="text-sm font-medium text-blue-800">
        {{ count() }} {{ count() === 1 ? 'persona' : 'personas' }} en lista de espera
      </span>
    </div>
  `,
})
export class WaitlistCountComponent implements OnInit {
  @Input({ required: true }) carId!: string;
  @Input({ required: true }) startDate!: string;
  @Input({ required: true }) endDate!: string;

  private readonly waitlistService = inject(WaitlistService);

  readonly count = signal(0);
  readonly loading = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadCount();
  }

  async loadCount(): Promise<void> {
    this.loading.set(true);

    try {
      const count = await this.waitlistService.getWaitlistCount(
        this.carId,
        this.startDate,
        this.endDate,
      );
      this.count.set(count);
    } catch (err) {
      console.error('Error loading waitlist count:', err);
    } finally {
      this.loading.set(false);
    }
  }
}

