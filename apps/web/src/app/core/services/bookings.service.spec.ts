import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingsService } from './bookings.service';

describe('BookingsService', () => {
  let component: BookingsService;
  let fixture: ComponentFixture<BookingsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingsService],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
