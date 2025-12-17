import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WithdrawalService } from './withdrawal.service';

describe('WithdrawalService', () => {
  let component: WithdrawalService;
  let fixture: ComponentFixture<WithdrawalService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WithdrawalService],
    }).compileComponents();

    fixture = TestBed.createComponent(WithdrawalService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
