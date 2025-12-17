import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarBlockingService } from './car-blocking.service';

describe('CarBlockingService', () => {
  let component: CarBlockingService;
  let fixture: ComponentFixture<CarBlockingService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarBlockingService],
    }).compileComponents();

    fixture = TestBed.createComponent(CarBlockingService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
