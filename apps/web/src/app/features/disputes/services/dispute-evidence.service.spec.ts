import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DisputeEvidenceService } from './dispute-evidence.service';

describe('DisputeEvidenceService', () => {
  let component: DisputeEvidenceService;
  let fixture: ComponentFixture<DisputeEvidenceService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisputeEvidenceService],
    }).compileComponents();

    fixture = TestBed.createComponent(DisputeEvidenceService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
