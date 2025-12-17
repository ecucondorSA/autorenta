import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LedgerPage } from './ledger.page';

describe('LedgerPage', () => {
  let component: LedgerPage;
  let fixture: ComponentFixture<LedgerPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LedgerPage],
    }).compileComponents();

    fixture = TestBed.createComponent(LedgerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
