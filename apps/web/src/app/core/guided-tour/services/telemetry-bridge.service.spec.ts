import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TelemetryBridgeService } from './telemetry-bridge.service';

describe('TelemetryBridgeService', () => {
  let component: TelemetryBridgeService;
  let fixture: ComponentFixture<TelemetryBridgeService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TelemetryBridgeService],
    }).compileComponents();

    fixture = TestBed.createComponent(TelemetryBridgeService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
