import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-booking-location-form',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <div class="location-form">
      <ion-item>
        <ion-label position="stacked">{{ label }}</ion-label>
        <ion-input
          [(ngModel)]="locationText"
          (ngModelChange)="onLocationChange()"
          [placeholder]="placeholder"
          type="text"
        ></ion-input>
      </ion-item>

      @if (suggestions?.length) {
        <div class="suggestions">
          <p class="suggestions-label">Puntos sugeridos</p>
          <div class="suggestions-grid">
            <button
              *ngFor="let s of suggestions"
              type="button"
              class="suggestion-chip"
              (click)="selectSuggestion(s)"
            >
              <ion-icon name="pin-outline"></ion-icon>
              <span>{{ s.label || s.address }}</span>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .location-form {
        margin-bottom: 1rem;
      }
      ion-item {
        --padding-start: 0;
      }
      .suggestions {
        margin-top: 0.5rem;
      }
      .suggestions-label {
        font-size: 0.75rem;
        color: var(--ion-color-medium);
        margin-bottom: 0.25rem;
      }
      .suggestions-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .suggestion-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        border-radius: 999px;
        border: 1px solid var(--ion-color-light);
        background: var(--ion-color-light-shade, #f4f4f4);
        color: var(--ion-color-dark);
        padding: 0.35rem 0.75rem;
        font-size: 0.85rem;
      }
      .suggestion-chip ion-icon {
        font-size: 1rem;
      }
    `,
  ],
})
export class BookingLocationFormComponent implements OnInit {
  @Input() initialLocation: { address?: string } | null = null;
  @Input() label = 'Ubicación';
  @Input() placeholder = 'Ingresa una dirección';
  @Input() suggestions: { address: string; lat: number; lng: number; label?: string }[] = [];
  @Output() locationChange = new EventEmitter<{ address: string; lat: number; lng: number }>();

  locationText = '';

  ngOnInit() {
    if (this.initialLocation) {
      this.locationText = this.initialLocation.address || '';
    }
  }

  onLocationChange() {
    // Emit a simple location object
    this.locationChange.emit({
      address: this.locationText,
      lat: 0,
      lng: 0,
    });
  }

  selectSuggestion(s: { address: string; lat: number; lng: number; label?: string }) {
    this.locationText = s.address;
    this.locationChange.emit({ address: s.address, lat: s.lat, lng: s.lng });
  }
}
