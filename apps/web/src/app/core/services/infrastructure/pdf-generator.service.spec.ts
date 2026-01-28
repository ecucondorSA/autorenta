import { TestBed } from '@angular/core/testing';
import { PdfGeneratorService } from '@core/services/infrastructure/pdf-generator.service';
import { testProviders } from '@app/testing/test-providers';

describe('PdfGeneratorService', () => {
  let service: PdfGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, PdfGeneratorService],
    });
    service = TestBed.inject(PdfGeneratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have generateFromElement method', () => {
    expect(typeof service.generateFromElement).toBe('function');
  });

  it('should have generateMultiPagePdf method', () => {
    expect(typeof service.generateMultiPagePdf).toBe('function');
  });
});
