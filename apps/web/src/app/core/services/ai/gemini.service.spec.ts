import { TestBed } from '@angular/core/testing';
import { GeminiService } from '@core/services/ai/gemini.service';
import { testProviders } from '@app/testing/test-providers';

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, GeminiService],
    });
    service = TestBed.inject(GeminiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have generateChatSuggestions method', () => {
    expect(typeof service.generateChatSuggestions).toBe('function');
  });

  it('should have askLegalQuestion method', () => {
    expect(typeof service.askLegalQuestion).toBe('function');
  });

  it('should have generateTripItinerary method', () => {
    expect(typeof service.generateTripItinerary).toBe('function');
  });

  it('should have generateVehicleChecklist method', () => {
    expect(typeof service.generateVehicleChecklist).toBe('function');
  });

  it('should have analyzeUserReputation method', () => {
    expect(typeof service.analyzeUserReputation).toBe('function');
  });

  it('should have getCarRecommendation method', () => {
    expect(typeof service.getCarRecommendation).toBe('function');
  });
});
