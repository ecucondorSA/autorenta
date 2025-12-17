import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingInitiationService } from './booking-initiation.service';

describe('BookingInitiationService', () => {
  let component: BookingInitiationService;
  let fixture: ComponentFixture<BookingInitiationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingInitiationService],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingInitiationService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
