import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreditSecurityPanelComponent } from './credit-security-panel.component';

describe('CreditSecurityPanelComponent', () => {
  let component: CreditSecurityPanelComponent;
  let fixture: ComponentFixture<CreditSecurityPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreditSecurityPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreditSecurityPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
