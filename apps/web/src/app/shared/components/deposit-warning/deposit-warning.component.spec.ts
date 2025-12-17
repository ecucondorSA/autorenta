import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DepositWarningComponent } from './deposit-warning.component';

describe('DepositWarningComponent', () => {
  let component: DepositWarningComponent;
  let fixture: ComponentFixture<DepositWarningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepositWarningComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DepositWarningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
