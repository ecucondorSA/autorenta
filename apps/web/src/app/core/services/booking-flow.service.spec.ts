import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingFlowService } from './booking-flow.service';

describe('BookingFlowService', () => {
  let component: BookingFlowService;
  let fixture: ComponentFixture<BookingFlowService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingFlowService],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingFlowService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
