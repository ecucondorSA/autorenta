import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GuidedTourService } from './guided-tour.service';
import { TourId } from './interfaces/tour-definition.interface';

describe('GuidedTourService', () => {
  let service: GuidedTourService;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate'], {
      events: jasmine.createSpyObj('events', ['pipe']),
      url: '/',
    });

    TestBed.configureTestingModule({
      providers: [
        GuidedTourService,
        { provide: Router, useValue: mockRouter },
      ],
    });

    service = TestBed.inject(GuidedTourService);

    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return available tours', () => {
    const tours = service.getAvailableTours();
    expect(tours).toBeDefined();
    expect(tours.length).toBeGreaterThan(0);
  });

  it('should start welcome tour', async () => {
    const result = await service.startWelcomeTour();
    expect(result).toBeDefined();
  });

  it('should track completed tours', async () => {
    const tourId = TourId.Welcome;
    
    // Initially not completed
    expect(service.hasCompleted(tourId)).toBeFalse();
    
    // Mark as completed (simulated by storage)
    localStorage.setItem(`autorenta:tour:${tourId}`, 'completed');
    
    // Should now be completed
    // Note: Need to reload state
  });

  it('should enable/disable debug mode', () => {
    service.enableDebug();
    expect(localStorage.getItem('autorenta:tour:debug')).toBe('true');
    
    service.disableDebug();
    expect(localStorage.getItem('autorenta:tour:debug')).toBeNull();
  });

  it('should return event history', () => {
    const history = service.getEventHistory();
    expect(Array.isArray(history)).toBeTrue();
  });

  it('should reset tour state', () => {
    const tourId = TourId.Welcome;
    
    // Set as completed
    localStorage.setItem(`autorenta:tour:${tourId}`, 'completed');
    
    // Reset
    service.reset(tourId);
    
    // Should be cleared
    expect(localStorage.getItem(`autorenta:tour:${tourId}`)).toBeNull();
  });

  it('should check if tour is running', () => {
    expect(typeof service.isRunning()).toBe('boolean');
  });

  it('should get current state', () => {
    const state = service.getState();
    expect(state).toBeDefined();
    expect(state.isRunning).toBeDefined();
    expect(state.activeTourId).toBeDefined();
  });
});
