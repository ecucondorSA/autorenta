import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RequestPayoutModalComponent } from './request-payout-modal.component';

describe('RequestPayoutModalComponent', () => {
  let component: RequestPayoutModalComponent;
  let fixture: ComponentFixture<RequestPayoutModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestPayoutModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RequestPayoutModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
