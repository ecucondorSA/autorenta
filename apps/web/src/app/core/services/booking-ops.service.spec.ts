import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingOpsService } from './booking-ops.service';

describe('BookingOpsService', () => {
  let component: BookingOpsService;
  let fixture: ComponentFixture<BookingOpsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingOpsService],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingOpsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
