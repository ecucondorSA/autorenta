import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingCompletionService } from './booking-completion.service';

describe('BookingCompletionService', () => {
  let component: BookingCompletionService;
  let fixture: ComponentFixture<BookingCompletionService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingCompletionService],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingCompletionService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
