import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StockPhotosSelectorComponent } from './stock-photos-selector.component';

describe('StockPhotosSelectorComponent', () => {
  let component: StockPhotosSelectorComponent;
  let fixture: ComponentFixture<StockPhotosSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockPhotosSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StockPhotosSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
