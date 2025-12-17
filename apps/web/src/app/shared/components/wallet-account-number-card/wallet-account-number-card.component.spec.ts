import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WalletAccountNumberCardComponent } from './wallet-account-number-card.component';

describe('WalletAccountNumberCardComponent', () => {
  let component: WalletAccountNumberCardComponent;
  let fixture: ComponentFixture<WalletAccountNumberCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletAccountNumberCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WalletAccountNumberCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
