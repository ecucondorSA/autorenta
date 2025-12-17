import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingFlowLoggerService } from './booking-flow-logger.service';

describe('BookingFlowLoggerService', () => {
  let component: BookingFlowLoggerService;
  let fixture: ComponentFixture<BookingFlowLoggerService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingFlowLoggerService],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingFlowLoggerService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
