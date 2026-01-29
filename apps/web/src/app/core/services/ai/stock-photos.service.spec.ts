import { TestBed } from '@angular/core/testing';
import { StockPhotosService } from '@core/services/ai/stock-photos.service';
import { testProviders } from '@app/testing/test-providers';

describe('StockPhotosService', () => {
  let service: StockPhotosService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, StockPhotosService],
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
