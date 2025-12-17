import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FeatureFlagService } from './feature-flag.service';

describe('FeatureFlagService', () => {
  let component: FeatureFlagService;
  let fixture: ComponentFixture<FeatureFlagService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureFlagService],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureFlagService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
