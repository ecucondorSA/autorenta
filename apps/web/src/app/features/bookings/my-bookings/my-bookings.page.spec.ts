import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyBookingsPage } from './my-bookings.page';

describe('MyBookingsPage', () => {
  let component: MyBookingsPage;
  let fixture: ComponentFixture<MyBookingsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyBookingsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(MyBookingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
