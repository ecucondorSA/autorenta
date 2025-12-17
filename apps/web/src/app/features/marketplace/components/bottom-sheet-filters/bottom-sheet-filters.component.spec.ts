import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BottomSheetFiltersComponent } from './bottom-sheet-filters.component';

describe('BottomSheetFiltersComponent', () => {
  let component: BottomSheetFiltersComponent;
  let fixture: ComponentFixture<BottomSheetFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomSheetFiltersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomSheetFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
