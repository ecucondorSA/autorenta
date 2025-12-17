import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnhancedMapTooltipComponent } from './enhanced-map-tooltip.component';

describe('EnhancedMapTooltipComponent', () => {
  let component: EnhancedMapTooltipComponent;
  let fixture: ComponentFixture<EnhancedMapTooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnhancedMapTooltipComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EnhancedMapTooltipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
