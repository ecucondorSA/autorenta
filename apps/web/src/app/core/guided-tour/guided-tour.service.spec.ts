import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuidedTourService } from './guided-tour.service';

describe('GuidedTourService', () => {
  let component: GuidedTourService;
  let fixture: ComponentFixture<GuidedTourService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuidedTourService],
    }).compileComponents();

    fixture = TestBed.createComponent(GuidedTourService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
