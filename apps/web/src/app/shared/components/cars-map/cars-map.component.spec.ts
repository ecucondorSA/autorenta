import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarsMapComponent } from './cars-map.component';

describe('CarsMapComponent', () => {
  let component: CarsMapComponent;
  let fixture: ComponentFixture<CarsMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarsMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CarsMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
