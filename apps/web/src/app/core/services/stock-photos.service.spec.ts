import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StockPhotosService } from './stock-photos.service';

describe('StockPhotosService', () => {
  let component: StockPhotosService;
  let fixture: ComponentFixture<StockPhotosService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockPhotosService],
    }).compileComponents();

    fixture = TestBed.createComponent(StockPhotosService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
