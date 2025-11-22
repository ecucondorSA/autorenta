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
    `,
  ],
})
export class BookingLocationFormComponent implements OnInit {
  @Input() initialLocation: { address?: string } | null = null;
  @Input() label = 'Ubicación';
  @Input() placeholder = 'Ingresa una dirección';
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
}
