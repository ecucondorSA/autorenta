import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DepositsMonitoringPage } from './deposits-monitoring.page';

describe('DepositsMonitoringPage', () => {
  let component: DepositsMonitoringPage;
  let fixture: ComponentFixture<DepositsMonitoringPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepositsMonitoringPage],
    }).compileComponents();

    fixture = TestBed.createComponent(DepositsMonitoringPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
