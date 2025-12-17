import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TourOrchestratorService } from './tour-orchestrator.service';

describe('TourOrchestratorService', () => {
  let component: TourOrchestratorService;
  let fixture: ComponentFixture<TourOrchestratorService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TourOrchestratorService],
    }).compileComponents();

    fixture = TestBed.createComponent(TourOrchestratorService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
