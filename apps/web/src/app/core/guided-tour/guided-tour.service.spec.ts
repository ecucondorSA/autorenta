import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { GuidedTourService } from './guided-tour.service';
import { TourId, TourState } from './interfaces/tour-definition.interface';
import { TourOrchestratorService } from './services/tour-orchestrator.service';
import { TourRegistryService } from './registry/tour-registry.service';
import { TelemetryBridgeService } from './services/telemetry-bridge.service';

describe('GuidedTourService', () => {
  let service: GuidedTourService;
  let mockRouter: jasmine.SpyObj<Router>;
  let orchestrator: jasmine.SpyObj<TourOrchestratorService>;
  let registry: jasmine.SpyObj<TourRegistryService>;
  let telemetry: jasmine.SpyObj<TelemetryBridgeService>;

  const baseState: TourState = {
    activeTourId: null,
    currentStepIndex: -1,
    isRunning: false,
    isPaused: false,
    completedTours: new Set<string>(),
  };
  let stateSignal: ReturnType<typeof signal<TourState>>;

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate'], {
      events: jasmine.createSpyObj('events', ['pipe']),
      url: '/',
    });

    stateSignal = signal<TourState>({ ...baseState });
    orchestrator = {
      requestTour: jasmine.createSpy('requestTour'),
      cancelTour: jasmine.createSpy('cancelTour'),
      dismissTour: jasmine.createSpy('dismissTour'),
      resetTour: jasmine.createSpy('resetTour'),
      getAvailableTours: jasmine.createSpy('getAvailableTours'),
      hasTourBeenCompleted: jasmine.createSpy('hasTourBeenCompleted'),
      state: stateSignal.asReadonly(),
    } as unknown as jasmine.SpyObj<TourOrchestratorService>;

    registry = jasmine.createSpyObj<TourRegistryService>('TourRegistryService', ['register']);
    telemetry = jasmine.createSpyObj<TelemetryBridgeService>('TelemetryBridgeService', [
      'enableDebug',
      'disableDebug',
      'getEventHistory',
    ]);
    telemetry.getEventHistory.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        GuidedTourService,
        { provide: Router, useValue: mockRouter },
        { provide: TourOrchestratorService, useValue: orchestrator },
        { provide: TourRegistryService, useValue: registry },
        { provide: TelemetryBridgeService, useValue: telemetry },
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
    const mockTours: any[] = [{ id: TourId.Welcome }];
    orchestrator.getAvailableTours.and.returnValue(mockTours as any);

    const tours = service.getAvailableTours();

    expect(tours).toBeDefined();
    expect(tours.length).toBeGreaterThan(0);
    expect(orchestrator.getAvailableTours).toHaveBeenCalled();
  });

  it('should start welcome tour', async () => {
    orchestrator.requestTour.and.resolveTo(true);

    const result = await service.startWelcomeTour();

    expect(result).toBeDefined();
    expect(orchestrator.requestTour).toHaveBeenCalledWith({
      id: TourId.Welcome,
      mode: 'user-triggered',
    });
  });

  it('should track completed tours', async () => {
    const tourId = TourId.Welcome;
    orchestrator.hasTourBeenCompleted.and.returnValue(false);
    expect(service.hasCompleted(tourId)).toBeFalse();

    orchestrator.hasTourBeenCompleted.and.returnValue(true);
    expect(service.hasCompleted(tourId)).toBeTrue();
  });

  it('should enable/disable debug mode', () => {
    service.enableDebug();
    expect(telemetry.enableDebug).toHaveBeenCalled();

    service.disableDebug();
    expect(telemetry.disableDebug).toHaveBeenCalled();
  });

  it('should return event history', () => {
    telemetry.getEventHistory.and.returnValue([
      { type: 'started', tourId: TourId.Welcome, timestamp: Date.now() },
    ]);
    const history = service.getEventHistory();
    expect(Array.isArray(history)).toBeTrue();
  });

  it('should reset tour state', () => {
    const tourId = TourId.Welcome;
    service.reset(tourId);
    expect(orchestrator.resetTour).toHaveBeenCalledWith(tourId);
  });

  it('should check if tour is running', () => {
    stateSignal.set({ ...baseState, isRunning: true });
    expect(service.isRunning()).toBeTrue();
  });

  it('should get current state', () => {
    stateSignal.set({ ...baseState, isRunning: true, activeTourId: TourId.Welcome });
    const state = service.getState();
    expect(state).toBeDefined();
    expect(state.isRunning).toBeDefined();
    expect(state.activeTourId).toBeDefined();
  });
});
