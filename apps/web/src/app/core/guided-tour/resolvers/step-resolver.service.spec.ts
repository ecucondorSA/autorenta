import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepResolverService } from './step-resolver.service';

describe('StepResolverService', () => {
  let component: StepResolverService;
  let fixture: ComponentFixture<StepResolverService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepResolverService],
    }).compileComponents();

    fixture = TestBed.createComponent(StepResolverService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
