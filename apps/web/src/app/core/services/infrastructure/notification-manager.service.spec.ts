import { TestBed } from '@angular/core/testing';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';

describe('NotificationManagerService', () => {
  let service: NotificationManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationManagerService],
    });
    service = TestBed.inject(NotificationManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have show method', () => {
    expect(typeof service.show).toBe('function');
  });

  it('should have clear method', () => {
    expect(typeof service.clear).toBe('function');
  });

  it('should have remove method', () => {
    expect(typeof service.remove).toBe('function');
  });

  it('should have success method', () => {
    expect(typeof service.success).toBe('function');
  });

  it('should have error method', () => {
    expect(typeof service.error).toBe('function');
  });

  it('should have warning method', () => {
    expect(typeof service.warning).toBe('function');
  });

  it('should have info method', () => {
    expect(typeof service.info).toBe('function');
  });

  it('should have getActiveCount method', () => {
    expect(typeof service.getActiveCount).toBe('function');
  });

  it('should have getQueuedCount method', () => {
    expect(typeof service.getQueuedCount).toBe('function');
  });
});
