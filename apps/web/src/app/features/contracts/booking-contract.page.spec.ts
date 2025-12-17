import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingContractPage } from './booking-contract.page';

describe('BookingContractPage', () => {
  let component: BookingContractPage;
  let fixture: ComponentFixture<BookingContractPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingContractPage],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingContractPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
