import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

export interface SmartTag {
  icon: string;
  label: string;
  condition: boolean;
  color?: 'green' | 'blue' | 'orange' | 'purple';
}

@Component({
  selector: 'app-smart-tags',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="smart-tags-container" *ngIf="activeTags.length > 0">
      <div
        *ngFor="let tag of activeTags; let i = index"
        [@tagEnter]="i"
        [class]="getTagClasses(tag)"
      >
        <span class="tag-icon">{{ tag.icon }}</span>
        <span class="tag-label">{{ tag.label }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      .smart-tags-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      @media (max-width: 640px) {
        .smart-tags-container {
          gap: 0.375rem;
        }
      }
      .tag {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;
      }
      .tag-icon {
        font-size: 0.875rem;
      }
      .tag-green {
        background-color: #dcfce7;
        color: #166534;
      }
      .tag-blue {
        background-color: #dbeafe;
        color: #1e40af;
      }
      .tag-orange {
        background-color: #fed7aa;
        color: #9a3412;
      }
      .tag-purple {
        background-color: #e9d5ff;
        color: #6b21a8;
      }
    `,
  ],
  animations: [
    trigger('tagEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
  ],
})
export class SmartTagsComponent {
  @Input() tags: SmartTag[] = [];

  get activeTags(): SmartTag[] {
    return this.tags.filter((tag) => tag.condition);
  }

  getTagClasses(tag: SmartTag): string {
    const colorClass = tag.color ? `tag-${tag.color}` : 'tag-green';
    return `tag ${colorClass}`;
  }
}
