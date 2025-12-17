import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingApprovalService } from './booking-approval.service';

describe('BookingApprovalService', () => {
  let component: BookingApprovalService;
  let fixture: ComponentFixture<BookingApprovalService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingApprovalService],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingApprovalService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
