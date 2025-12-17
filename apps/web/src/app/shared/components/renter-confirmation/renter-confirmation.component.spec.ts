import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RenterConfirmationComponent } from './renter-confirmation.component';

describe('RenterConfirmationComponent', () => {
  let component: RenterConfirmationComponent;
  let fixture: ComponentFixture<RenterConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RenterConfirmationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RenterConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
