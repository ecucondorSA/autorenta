import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BonusProtectorPurchaseComponent } from './bonus-protector-purchase.component';

describe('BonusProtectorPurchaseComponent', () => {
  let component: BonusProtectorPurchaseComponent;
  let fixture: ComponentFixture<BonusProtectorPurchaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonusProtectorPurchaseComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BonusProtectorPurchaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
