import { TestBed } from '@angular/core/testing';
import { AiPhotoEnhancerService } from '@core/services/ai/ai-photo-enhancer.service';

describe('AiPhotoEnhancerService', () => {
  let service: AiPhotoEnhancerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AiPhotoEnhancerService]
    });
    service = TestBed.inject(AiPhotoEnhancerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have generateCarPhotos method', () => {
    expect(typeof service.generateCarPhotos).toBe('function');
  });

  it('should have enhanceExistingPhoto method', () => {
    expect(typeof service.enhanceExistingPhoto).toBe('function');
  });

  it('should have addPremiumBackground method', () => {
    expect(typeof service.addPremiumBackground).toBe('function');
  });

  it('should have cleanupPreviews method', () => {
    expect(typeof service.cleanupPreviews).toBe('function');
  });

});
