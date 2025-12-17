import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IncidentDetectorService } from './incident-detector.service';

describe('IncidentDetectorService', () => {
  let component: IncidentDetectorService;
  let fixture: ComponentFixture<IncidentDetectorService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentDetectorService],
    }).compileComponents();

    fixture = TestBed.createComponent(IncidentDetectorService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
