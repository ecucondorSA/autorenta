import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoverageUpgradeSelectorComponent } from './coverage-upgrade-selector.component';

describe('CoverageUpgradeSelectorComponent', () => {
  let component: CoverageUpgradeSelectorComponent;
  let fixture: ComponentFixture<CoverageUpgradeSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoverageUpgradeSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CoverageUpgradeSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
