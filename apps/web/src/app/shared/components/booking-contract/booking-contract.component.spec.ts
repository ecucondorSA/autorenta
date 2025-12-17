import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingContractComponent } from './booking-contract.component';

describe('BookingContractComponent', () => {
  let component: BookingContractComponent;
  let fixture: ComponentFixture<BookingContractComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingContractComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingContractComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
