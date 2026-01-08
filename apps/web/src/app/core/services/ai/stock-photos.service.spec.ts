import { TestBed } from '@angular/core/testing';
import { StockPhotosService } from '@core/services/ai/stock-photos.service';

describe('StockPhotosService', () => {
  let service: StockPhotosService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StockPhotosService],
    });
    service = TestBed.inject(StockPhotosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have searchCarPhotos method', () => {
    expect(typeof service.searchCarPhotos).toBe('function');
  });

  it('should have downloadPhoto method', () => {
    expect(typeof service.downloadPhoto).toBe('function');
  });

  it('should have trackDownload method', () => {
    expect(typeof service.trackDownload).toBe('function');
  });
});
