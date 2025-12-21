import { TestBed } from '@angular/core/testing';
import { SeoSchemaService } from './seo-schema.service';

describe('SeoSchemaService', () => {
  let service: SeoSchemaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SeoSchemaService]
    });
    service = TestBed.inject(SeoSchemaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have setOrganizationSchema method', () => {
    expect(typeof service.setOrganizationSchema).toBe('function');
  });

  it('should have setLocalBusinessSchema method', () => {
    expect(typeof service.setLocalBusinessSchema).toBe('function');
  });

  it('should have setFAQSchema method', () => {
    expect(typeof service.setFAQSchema).toBe('function');
  });

  it('should have setCarProductSchema method', () => {
    expect(typeof service.setCarProductSchema).toBe('function');
  });

  it('should have setBreadcrumbSchema method', () => {
    expect(typeof service.setBreadcrumbSchema).toBe('function');
  });

  it('should have setWebSiteSchema method', () => {
    expect(typeof service.setWebSiteSchema).toBe('function');
  });

  it('should have removeSchema method', () => {
    expect(typeof service.removeSchema).toBe('function');
  });

  it('should have removeAllSchemas method', () => {
    expect(typeof service.removeAllSchemas).toBe('function');
  });

  it('should have initializeLandingPageSchemas method', () => {
    expect(typeof service.initializeLandingPageSchemas).toBe('function');
  });

});
