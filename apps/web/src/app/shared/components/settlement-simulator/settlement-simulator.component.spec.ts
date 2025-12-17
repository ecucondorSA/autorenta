import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettlementSimulatorComponent } from './settlement-simulator.component';

describe('SettlementSimulatorComponent', () => {
  let component: SettlementSimulatorComponent;
  let fixture: ComponentFixture<SettlementSimulatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettlementSimulatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SettlementSimulatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
