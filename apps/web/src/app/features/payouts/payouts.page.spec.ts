import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayoutsPage } from './payouts.page';

describe('PayoutsPage', () => {
  let component: PayoutsPage;
  let fixture: ComponentFixture<PayoutsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayoutsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(PayoutsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
