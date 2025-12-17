import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingLocationFormComponent } from './booking-location-form.component';

describe('BookingLocationFormComponent', () => {
  let component: BookingLocationFormComponent;
  let fixture: ComponentFixture<BookingLocationFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingLocationFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingLocationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
