import { TestBed } from '@angular/core/testing';
import { OfflineManagerService } from '@core/services/infrastructure/offline-manager.service';

describe('OfflineManagerService', () => {
  let service: OfflineManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OfflineManagerService],
    });
    service = TestBed.inject(OfflineManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have queueMutation method', () => {
    expect(typeof service.queueMutation).toBe('function');
  });

  it('should have removeMutation method', () => {
    expect(typeof service.removeMutation).toBe('function');
  });

  it('should have isOffline method', () => {
    expect(typeof service.isOffline).toBe('function');
  });

  it('should have clearQueue method', () => {
    expect(typeof service.clearQueue).toBe('function');
  });
});
