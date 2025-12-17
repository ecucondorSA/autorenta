import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UrgentRentalService } from './urgent-rental.service';

describe('UrgentRentalService', () => {
  let component: UrgentRentalService;
  let fixture: ComponentFixture<UrgentRentalService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UrgentRentalService],
    }).compileComponents();

    fixture = TestBed.createComponent(UrgentRentalService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
