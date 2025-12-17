import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OwnerBookingsPage } from './owner-bookings.page';

describe('OwnerBookingsPage', () => {
  let component: OwnerBookingsPage;
  let fixture: ComponentFixture<OwnerBookingsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerBookingsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(OwnerBookingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
