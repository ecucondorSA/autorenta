import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingUtilsService } from './booking-utils.service';

describe('BookingUtilsService', () => {
  let component: BookingUtilsService;
  let fixture: ComponentFixture<BookingUtilsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingUtilsService],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingUtilsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
