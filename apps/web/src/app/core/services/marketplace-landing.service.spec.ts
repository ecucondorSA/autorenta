import { TestBed } from '@angular/core/testing';
import { MarketplaceLandingService } from './marketplace-landing.service';

describe('MarketplaceLandingService', () => {
  let service: MarketplaceLandingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MarketplaceLandingService]
    });
    service = TestBed.inject(MarketplaceLandingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have setSearchQuery method', () => {
    expect(typeof service.setSearchQuery).toBe('function');
  });

  it('should have setLocation method', () => {
    expect(typeof service.setLocation).toBe('function');
  });

  it('should have setDateRange method', () => {
    expect(typeof service.setDateRange).toBe('function');
  });

  it('should have updateFilters method', () => {
    expect(typeof service.updateFilters).toBe('function');
  });

  it('should have toggleQuickFilter method', () => {
    expect(typeof service.toggleQuickFilter).toBe('function');
  });

  it('should have isQuickFilterActive method', () => {
    expect(typeof service.isQuickFilterActive).toBe('function');
  });

  it('should have clearAllFilters method', () => {
    expect(typeof service.clearAllFilters).toBe('function');
  });

  it('should have setViewMode method', () => {
    expect(typeof service.setViewMode).toBe('function');
  });

  it('should have setSortOrder method', () => {
    expect(typeof service.setSortOrder).toBe('function');
  });

  it('should have setUserLocation method', () => {
    expect(typeof service.setUserLocation).toBe('function');
  });

});
