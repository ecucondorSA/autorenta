import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

export interface HostProfile {
  id: string;
  name: string;
  city: string;
  avatar: string;
  rating: number;
  tripsCount: number;
  responseTime: string;
  verified: boolean;
  superhost: boolean;
  quote?: string;
  joinedDate?: Date;
  responseRate?: number;
}

@Component({
  selector: 'app-host-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="host-profile-card" [@hostEnter]>
      <div class="card-header">
        <div class="avatar-section">
          <img [src]="host.avatar" [alt]="host.name" class="host-avatar" />
          <div class="host-info">
            <div class="host-name-row">
              <h3 class="host-name">{{ host.name }}</h3>
              <span *ngIf="host.verified" class="verified-badge" title="Verificado">✓</span>
              <span *ngIf="host.superhost" class="superhost-badge" title="Superhost">⭐</span>
            </div>
            <p class="host-location">{{ host.city }}</p>
            <p *ngIf="host.joinedDate" class="joined-date">Se unió {{ formatJoinDate(host.joinedDate) }}</p>
          </div>
        </div>
      </div>
      
      <p *ngIf="host.quote" class="host-quote">"{{ host.quote }}"</p>
      
      <div class="stats-grid">
        <div class="stat-item">
          <p class="stat-value">{{ host.rating }}</p>
          <p class="stat-label">Rating</p>
        </div>
        <div class="stat-item">
          <p class="stat-value">{{ host.tripsCount }}</p>
          <p class="stat-label">Viajes</p>
        </div>
        <div class="stat-item">
          <p class="stat-value">{{ host.responseTime }}</p>
          <p class="stat-label">Respuesta</p>
        </div>
        <div class="stat-item" *ngIf="host.responseRate">
          <p class="stat-value">{{ host.responseRate }}%</p>
          <p class="stat-label">Tasa resp.</p>
        </div>
      </div>
      
      <button class="contact-button" (click)="contactHost.emit()">
        💬 Contactar
      </button>
    </div>
  `,
  styles: [`
    .host-profile-card {
      background: white;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    .card-header { margin-bottom: 1rem; }
    .avatar-section {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }
    .host-avatar {
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 9999px;
      object-fit: cover;
    }
    @media (max-width: 640px) {
      .host-avatar { width: 3rem; height: 3rem; }
    }
    .host-info { flex: 1; }
    .host-name-row {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }
    .host-name {
      font-size: 1.125rem;
      font-weight: 600;
      color: #171717;
      margin: 0;
    }
    .verified-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      background: #3b82f6;
      color: white;
      border-radius: 9999px;
      font-size: 0.625rem;
    }
    .superhost-badge {
      font-size: 1rem;
      color: #f59e0b;
    }
    .host-location {
      font-size: 0.875rem;
      color: #737373;
      margin: 0.25rem 0 0 0;
    }
    .joined-date {
      font-size: 0.75rem;
      color: #a3a3a3;
      margin: 0.25rem 0 0 0;
    }
    .host-quote {
      font-size: 0.875rem;
      font-style: italic;
      color: #525252;
      margin: 1rem 0;
      padding: 0.75rem;
      background: #f5f5f5;
      border-radius: 0.5rem;
      border-left: 3px solid #3ba870;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
      margin: 1rem 0;
    }
    @media (max-width: 640px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .stat-item {
      text-align: center;
      padding: 0.5rem;
    }
    .stat-value {
      font-size: 1.125rem;
      font-weight: 600;
      color: #171717;
      margin: 0;
    }
    .stat-label {
      font-size: 0.75rem;
      color: #737373;
      margin: 0.25rem 0 0 0;
    }
    .contact-button {
      width: 100%;
      padding: 0.75rem 1rem;
      background: #3ba870;
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 200ms ease-out;
    }
    .contact-button:hover {
      background: #2d8859;
      transform: translateY(-2px);
    }
  `],
  animations: [
    trigger('hostEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class HostProfileComponent {
  @Input() host!: HostProfile;
  @Output() contactHost = new EventEmitter<void>();

  formatJoinDate(date: Date): string {
    const months = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (months < 1) return 'recientemente';
    if (months < 12) return 'hace ' + months + ' mes' + (months > 1 ? 'es' : '');
    const years = Math.floor(months / 12);
    return 'hace ' + years + ' año' + (years > 1 ? 's' : '');
  }
}
