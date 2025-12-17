import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CashFlowPage } from './cash-flow.page';

describe('CashFlowPage', () => {
  let component: CashFlowPage;
  let fixture: ComponentFixture<CashFlowPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CashFlowPage],
    }).compileComponents();

    fixture = TestBed.createComponent(CashFlowPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
