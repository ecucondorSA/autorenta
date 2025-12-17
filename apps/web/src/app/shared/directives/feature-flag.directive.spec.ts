import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FeatureFlagDirective } from './feature-flag.directive';

describe('FeatureFlagDirective', () => {
  let component: FeatureFlagDirective;
  let fixture: ComponentFixture<FeatureFlagDirective>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureFlagDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureFlagDirective);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
