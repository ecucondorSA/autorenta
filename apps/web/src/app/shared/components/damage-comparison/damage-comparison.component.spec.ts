import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DamageComparisonComponent } from './damage-comparison.component';

describe('DamageComparisonComponent', () => {
  let component: DamageComparisonComponent;
  let fixture: ComponentFixture<DamageComparisonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DamageComparisonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DamageComparisonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
