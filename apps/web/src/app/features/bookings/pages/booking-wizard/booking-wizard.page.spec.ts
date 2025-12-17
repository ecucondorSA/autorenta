import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingWizardPage } from './booking-wizard.page';

describe('BookingWizardPage', () => {
  let component: BookingWizardPage;
  let fixture: ComponentFixture<BookingWizardPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingWizardPage],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingWizardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
