import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TelemetryService } from './telemetry.service';

describe('TelemetryService', () => {
  let component: TelemetryService;
  let fixture: ComponentFixture<TelemetryService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TelemetryService],
    }).compileComponents();

    fixture = TestBed.createComponent(TelemetryService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
