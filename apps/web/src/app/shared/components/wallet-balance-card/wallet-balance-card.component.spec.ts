import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WalletBalanceCardComponent } from './wallet-balance-card.component';

describe('WalletBalanceCardComponent', () => {
  let component: WalletBalanceCardComponent;
  let fixture: ComponentFixture<WalletBalanceCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletBalanceCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WalletBalanceCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
