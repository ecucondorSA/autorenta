import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DistanceRiskTierBadgeComponent } from './distance-risk-tier-badge.component';

describe('DistanceRiskTierBadgeComponent', () => {
  let component: DistanceRiskTierBadgeComponent;
  let fixture: ComponentFixture<DistanceRiskTierBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DistanceRiskTierBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DistanceRiskTierBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
