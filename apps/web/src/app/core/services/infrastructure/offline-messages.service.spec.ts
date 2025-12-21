import { TestBed } from '@angular/core/testing';
import { OfflineMessagesService } from '@core/services/infrastructure/offline-messages.service';

describe('OfflineMessagesService', () => {
  let service: OfflineMessagesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OfflineMessagesService]
    });
    service = TestBed.inject(OfflineMessagesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have init method', () => {
    expect(typeof service.init).toBe('function');
  });

  it('should have queueMessage method', () => {
    expect(typeof service.queueMessage).toBe('function');
  });

  it('should have getPendingMessages method', () => {
    expect(typeof service.getPendingMessages).toBe('function');
  });

  it('should have removeMessage method', () => {
    expect(typeof service.removeMessage).toBe('function');
  });

  it('should have incrementRetry method', () => {
    expect(typeof service.incrementRetry).toBe('function');
  });

  it('should have clearAll method', () => {
    expect(typeof service.clearAll).toBe('function');
  });

  it('should have getMessagesForRetry method', () => {
    expect(typeof service.getMessagesForRetry).toBe('function');
  });

  it('should have getFailedMessages method', () => {
    expect(typeof service.getFailedMessages).toBe('function');
  });

  it('should have removeFailedMessages method', () => {
    expect(typeof service.removeFailedMessages).toBe('function');
  });

  it('should have shouldRetry method', () => {
    expect(typeof service.shouldRetry).toBe('function');
  });

});
