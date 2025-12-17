import { ComponentFixture, TestBed } from '@angular/core/testing';
import { bookings.routes } from './bookings.routes';

describe('bookings.routes', () => {
  let component: bookings.routes;
  let fixture: ComponentFixture<bookings.routes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [bookings.routes],
    }).compileComponents();

    fixture = TestBed.createComponent(bookings.routes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
