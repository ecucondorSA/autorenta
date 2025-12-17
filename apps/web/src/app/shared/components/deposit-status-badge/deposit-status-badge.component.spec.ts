import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DepositStatusBadgeComponent } from './deposit-status-badge.component';

describe('DepositStatusBadgeComponent', () => {
  let component: DepositStatusBadgeComponent;
  let fixture: ComponentFixture<DepositStatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepositStatusBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DepositStatusBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
