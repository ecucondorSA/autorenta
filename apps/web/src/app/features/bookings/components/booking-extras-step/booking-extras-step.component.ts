import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { BookingWizardData } from '../../pages/booking-wizard/booking-wizard.page';
import { Car } from '../../../../core/models';

interface Extra {
  id: string;
  type: 'gps' | 'child_seat' | 'additional_driver' | 'toll_pass' | 'fuel_prepaid' | 'delivery';
  name: string;
  description: string;
  icon: string;
  dailyRate: number;
  quantity: number;
  maxQuantity: number;
}

@Component({
  selector: 'app-booking-extras-step',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="extras-step-container">
      <div class="step-header">
        <h2>Personaliza tu experiencia</h2>
        <p>Agrega extras a tu reserva (opcional)</p>
      </div>

      <div class="extras-list">
        @for (extra of availableExtras(); track extra.id) {
          <ion-card class="extra-card" [class.selected]="extra.quantity > 0">
            <ion-card-content>
              <div class="extra-header">
                <div class="extra-info">
                  <ion-icon [name]="extra.icon" class="extra-icon"></ion-icon>
                  <div>
                    <h3>{{ extra.name }}</h3>
                    <p>{{ extra.description }}</p>
                  </div>
                </div>
                <div class="extra-price">\${{ extra.dailyRate }}/día</div>
              </div>
              <div class="quantity-selector">
                <ion-button
                  fill="outline"
                  size="small"
                  [disabled]="extra.quantity === 0"
                  (click)="decrementExtra(extra)"
                >
                  <ion-icon name="remove"></ion-icon>
                </ion-button>
                <span class="quantity">{{ extra.quantity }}</span>
                <ion-button
                  fill="outline"
                  size="small"
                  [disabled]="extra.quantity >= extra.maxQuantity"
                  (click)="incrementExtra(extra)"
                >
                  <ion-icon name="add"></ion-icon>
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        }
      </div>

      @if (selectedExtrasCount() > 0) {
        <ion-card class="summary-card">
          <ion-card-header>
            <ion-card-title>Extras seleccionados</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            @for (extra of selectedExtras(); track extra.id) {
              <div class="summary-item">
                <span>{{ extra.name }} x{{ extra.quantity }}</span>
                <span>\${{ extra.dailyRate * extra.quantity }}/día</span>
              </div>
            }
          </ion-card-content>
        </ion-card>
      }
    </div>
  `,
  styles: [
    `
      .extras-step-container {
        max-width: 800px;
        margin: 0 auto;
      }
      .step-header {
        text-align: center;
        margin-bottom: 1.5rem;
      }
      .step-header h2 {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
      }
      .step-header p {
        color: var(--ion-color-medium);
      }
      .extra-card {
        margin-bottom: 1rem;
        transition: all 0.2s;
      }
      .extra-card.selected {
        border: 2px solid var(--ion-color-primary);
      }
      .extra-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      .extra-info {
        display: flex;
        gap: 1rem;
        align-items: center;
        flex: 1;
      }
      .extra-icon {
        font-size: 2rem;
        color: var(--ion-color-primary);
      }
      .extra-info h3 {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
      }
      .extra-info p {
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        margin: 0.25rem 0 0;
      }
      .extra-price {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--ion-color-primary);
      }
      .quantity-selector {
        display: flex;
        align-items: center;
        gap: 1rem;
        justify-content: center;
      }
      .quantity {
        font-size: 1.2rem;
        font-weight: 600;
        min-width: 30px;
        text-align: center;
      }
      .summary-item {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--ion-color-light);
      }
    `,
  ],
})
export class BookingExtrasStepComponent implements OnInit {
  @Input() car: Car | null = null;
  @Input() data: BookingWizardData | null = null;
  @Output() dataChange = new EventEmitter<Partial<BookingWizardData>>();

  availableExtras = signal<Extra[]>([
    {
      id: '1',
      type: 'gps',
      name: 'GPS',
      description: 'Navegador GPS portátil',
      icon: 'navigate-outline',
      dailyRate: 5,
      quantity: 0,
      maxQuantity: 2,
    },
    {
      id: '2',
      type: 'child_seat',
      name: 'Silla para niños',
      description: 'Asiento de seguridad certificado',
      icon: 'person-outline',
      dailyRate: 3,
      quantity: 0,
      maxQuantity: 3,
    },
    {
      id: '3',
      type: 'additional_driver',
      name: 'Conductor adicional',
      description: 'Agregar otro conductor autorizado',
      icon: 'people-outline',
      dailyRate: 10,
      quantity: 0,
      maxQuantity: 2,
    },
    {
      id: '4',
      type: 'toll_pass',
      name: 'Pase de peajes',
      description: 'Pago automático de peajes',
      icon: 'card-outline',
      dailyRate: 8,
      quantity: 0,
      maxQuantity: 1,
    },
    {
      id: '5',
      type: 'delivery',
      name: 'Entrega a domicilio',
      description: 'Llevamos el auto a tu ubicación',
      icon: 'car-outline',
      dailyRate: 20,
      quantity: 0,
      maxQuantity: 1,
    },
  ]);

  selectedExtrasCount = signal(0);
  selectedExtras = signal<Extra[]>([]);

  ngOnInit() {
    if (this.data?.extras && this.data.extras.length > 0) {
      const extrasMap = new Map(this.data.extras.map((e) => [e.id, e.quantity]));
      this.availableExtras.update((extras) =>
        extras.map((e) => ({ ...e, quantity: extrasMap.get(e.id) || 0 })),
      );
      this.updateSelected();
    }
  }

  incrementExtra(extra: Extra) {
    if (extra.quantity < extra.maxQuantity) {
      this.availableExtras.update((extras) =>
        extras.map((e) => (e.id === extra.id ? { ...e, quantity: e.quantity + 1 } : e)),
      );
      this.updateSelected();
      this.emitChanges();
    }
  }

  decrementExtra(extra: Extra) {
    if (extra.quantity > 0) {
      this.availableExtras.update((extras) =>
        extras.map((e) => (e.id === extra.id ? { ...e, quantity: e.quantity - 1 } : e)),
      );
      this.updateSelected();
      this.emitChanges();
    }
  }

  updateSelected() {
    const selected = this.availableExtras().filter((e) => e.quantity > 0);
    this.selectedExtras.set(selected);
    this.selectedExtrasCount.set(selected.reduce((sum, e) => sum + e.quantity, 0));
  }

  emitChanges() {
    const extras = this.selectedExtras().map((e) => ({
      id: e.id,
      type: e.type,
      quantity: e.quantity,
      dailyRate: e.dailyRate,
    }));
    this.dataChange.emit({ extras });
  }
}
