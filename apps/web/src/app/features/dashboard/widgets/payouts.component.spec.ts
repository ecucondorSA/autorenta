import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayoutsWidgetComponent } from './payouts.component';

describe('PayoutsWidgetComponent', () => {
  let component: PayoutsWidgetComponent;
  let fixture: ComponentFixture<PayoutsWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayoutsWidgetComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayoutsWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
