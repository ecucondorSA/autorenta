import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WithdrawalRequestFormComponent } from './withdrawal-request-form.component';

describe('WithdrawalRequestFormComponent', () => {
  let component: WithdrawalRequestFormComponent;
  let fixture: ComponentFixture<WithdrawalRequestFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WithdrawalRequestFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WithdrawalRequestFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
