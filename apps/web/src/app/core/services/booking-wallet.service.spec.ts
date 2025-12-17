import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingWalletService } from './booking-wallet.service';

describe('BookingWalletService', () => {
  let component: BookingWalletService;
  let fixture: ComponentFixture<BookingWalletService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingWalletService],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingWalletService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
