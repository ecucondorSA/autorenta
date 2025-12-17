import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReconciliationPage } from './reconciliation.page';

describe('ReconciliationPage', () => {
  let component: ReconciliationPage;
  let fixture: ComponentFixture<ReconciliationPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReconciliationPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ReconciliationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
