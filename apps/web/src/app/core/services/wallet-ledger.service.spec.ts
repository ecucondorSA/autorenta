import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WalletLedgerService } from './wallet-ledger.service';

describe('WalletLedgerService', () => {
  let component: WalletLedgerService;
  let fixture: ComponentFixture<WalletLedgerService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletLedgerService],
    }).compileComponents();

    fixture = TestBed.createComponent(WalletLedgerService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
