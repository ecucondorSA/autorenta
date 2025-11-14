import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SearchCriteria {
  location: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

/**
 * Quick Search Card Component V2
 * Floating search widget for home page
 * 
 * Features:
 * - Location input with geolocation
 * - Date/time pickers
 * - Compact mobile design
 * - Smooth animations
 * - Form validation
 */
@Component({
  selector: 'app-quick-search-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="quick-search-card">
      <!-- Header -->
      <div class="search-header">
        <h2 class="search-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
            <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Buscar vehículo
        </h2>
        <p class="search-subtitle">Encuentra tu auto ideal</p>
      </div>

      <!-- Search Form -->
      <form class="search-form" (ngSubmit)="handleSearch()">
        <!-- Location -->
        <div class="form-group">
          <label class="form-label">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 10C11.1046 10 12 9.10457 12 8C12 6.89543 11.1046 6 10 6C8.89543 6 8 6.89543 8 8C8 9.10457 8.89543 10 10 10Z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M10 18C10 18 16 13 16 8C16 4.68629 13.3137 2 10 2C6.68629 2 4 4.68629 4 8C4 13 10 18 10 18Z" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            Ubicación
          </label>
          <div class="input-wrapper">
            <input
              type="text"
              class="form-input"
              placeholder="¿Dónde necesitas el auto?"
              [(ngModel)]="location"
              name="location"
              required
            />
            <button
              type="button"
              class="location-btn"
              (click)="getUserLocation()"
              [disabled]="isLoadingLocation()"
              [attr.aria-label]="'Usar mi ubicación'"
            >
              @if (isLoadingLocation()) {
                <svg class="spinner" width="20" height="20" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/>
                  <path d="M10 2C14.4183 2 18 5.58172 18 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
                </svg>
              } @else {
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2V4M10 16V18M4 10H2M18 10H16M10 10L14.5 5.5M10 10C11.1046 10 12 9.10457 12 8C12 6.89543 11.1046 6 10 6C8.89543 6 8 6.89543 8 8C8 9.10457 8.89543 10 10 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              }
            </button>
          </div>
        </div>

        <!-- Dates -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="4" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <path d="M3 8H17M7 2V5M13 2V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              Inicio
            </label>
            <input
              type="date"
              class="form-input"
              [(ngModel)]="startDate"
              name="startDate"
              [min]="minDate"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="4" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <path d="M3 8H17M7 2V5M13 2V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              Fin
            </label>
            <input
              type="date"
              class="form-input"
              [(ngModel)]="endDate"
              name="endDate"
              [min]="startDate || minDate"
              required
            />
          </div>
        </div>

        <!-- Times -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/>
                <path d="M10 6V10L13 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              Hora inicio
            </label>
            <input
              type="time"
              class="form-input"
              [(ngModel)]="startTime"
              name="startTime"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/>
                <path d="M10 6V10L13 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              Hora fin
            </label>
            <input
              type="time"
              class="form-input"
              [(ngModel)]="endTime"
              name="endTime"
              required
            />
          </div>
        </div>

        <!-- Submit Button -->
        <button type="submit" class="search-btn">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="2"/>
            <path d="M18 18L13.5 13.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Buscar vehículos disponibles
        </button>
      </form>

      <!-- Quick Stats -->
      <div class="quick-stats">
        <div class="stat">
          <span class="stat-value">1,240+</span>
          <span class="stat-label">Vehículos</span>
        </div>
        <div class="stat">
          <span class="stat-value">98%</span>
          <span class="stat-label">Satisfacción</span>
        </div>
        <div class="stat">
          <span class="stat-value">24/7</span>
          <span class="stat-label">Soporte</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .quick-search-card {
      background: white;
      border-radius: 24px;
      padding: 24px;
      box-shadow: 
        0 10px 40px rgba(0, 0, 0, 0.1),
        0 2px 8px rgba(0, 0, 0, 0.06);
      margin: -60px 20px 32px;
      position: relative;
      z-index: 10;
      animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .search-header {
      margin-bottom: 24px;
    }

    .search-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0 0 8px 0;
    }

    .search-title svg {
      color: #4F46E5;
    }

    .search-subtitle {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
    }

    .search-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .form-label svg {
      color: #6b7280;
    }

    .input-wrapper {
      position: relative;
    }

    .form-input {
      width: 100%;
      padding: 14px 16px;
      font-size: 1rem;
      color: #1a1a1a;
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      transition: all 0.2s ease;
    }

    .input-wrapper .form-input {
      padding-right: 48px;
    }

    .form-input:focus {
      outline: none;
      background: white;
      border-color: #4F46E5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }

    .form-input::placeholder {
      color: #9ca3af;
    }

    .location-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #4F46E5;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .location-btn:hover:not(:disabled) {
      background: #4338ca;
    }

    .location-btn:active:not(:disabled) {
      transform: translateY(-50%) scale(0.95);
    }

    .location-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .search-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      padding: 16px 24px;
      font-size: 1rem;
      font-weight: 600;
      color: white;
      background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%);
      border: none;
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .search-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.5);
    }

    .search-btn:active {
      transform: translateY(0);
    }

    .quick-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }

    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #4F46E5;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #6b7280;
    }

    /* Tablet & Desktop */
    @media (min-width: 768px) {
      .quick-search-card {
        max-width: 600px;
        margin: -80px auto 48px;
        padding: 32px;
      }

      .search-title {
        font-size: 1.75rem;
      }

      .form-row {
        gap: 16px;
      }

      .search-btn {
        padding: 18px 32px;
        font-size: 1.125rem;
      }
    }
  `]
})
export class QuickSearchCardComponent {
  // Outputs
  search = output<SearchCriteria>();

  // State
  location = signal('');
  startDate = signal('');
  endDate = signal('');
  startTime = signal('10:00');
  endTime = signal('18:00');
  isLoadingLocation = signal(false);

  // Min date is today
  minDate = new Date().toISOString().split('T')[0];

  handleSearch(): void {
    const criteria: SearchCriteria = {
      location: this.location(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      startTime: this.startTime(),
      endTime: this.endTime(),
    };

    console.log('Search criteria:', criteria);
    this.search.emit(criteria);
  }

  getUserLocation(): void {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    this.isLoadingLocation.set(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // In production, reverse geocode coordinates to address
        const { latitude, longitude } = position.coords;
        this.location.set(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        this.isLoadingLocation.set(false);

        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('No pudimos obtener tu ubicación');
        this.isLoadingLocation.set(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }
}
