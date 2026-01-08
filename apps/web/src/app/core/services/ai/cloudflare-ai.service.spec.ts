import { TestBed } from '@angular/core/testing';
import { CloudflareAiService } from '@core/services/ai/cloudflare-ai.service';

describe('CloudflareAiService', () => {
  let service: CloudflareAiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CloudflareAiService],
    });
    service = TestBed.inject(CloudflareAiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have generateCarImage method', () => {
    expect(typeof service.generateCarImage).toBe('function');
  });

  it('should have generateMultipleCarImages method', () => {
    expect(typeof service.generateMultipleCarImages).toBe('function');
  });

  it('should have healthCheck method', () => {
    expect(typeof service.healthCheck).toBe('function');
  });
});
