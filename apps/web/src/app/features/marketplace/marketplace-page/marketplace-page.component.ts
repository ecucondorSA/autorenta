import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarCardComponent } from '../../../shared/components/car-card/car-card.component';
import { MockCarService } from '../../../core/services/mock-car.service';
import { Car } from '../../../core/models';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-marketplace-page',
  standalone: true,
  imports: [CommonModule, CarCardComponent],
  templateUrl: './marketplace-page.component.html',
})
export class MarketplacePageComponent implements OnInit {
  private carService = inject(MockCarService);
  public cars$!: Observable<Car[]>;

  ngOnInit(): void {
    this.cars$ = this.carService.getCars();
  }
}
