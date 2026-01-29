import { TestBed } from '@angular/core/testing';
import { NotificationSoundService } from '@core/services/infrastructure/notification-sound.service';
import { testProviders } from '@app/testing/test-providers';

describe('NotificationSoundService', () => {
  let service: NotificationSoundService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, NotificationSoundService],
    });
    service = TestBed.inject(NotificationSoundService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have playNotificationSound method', () => {
    expect(typeof service.playNotificationSound).toBe('function');
  });

  it('should have playMessageSentSound method', () => {
    expect(typeof service.playMessageSentSound).toBe('function');
  });

  it('should have toggleSound method', () => {
    expect(typeof service.toggleSound).toBe('function');
  });

  it('should have isSoundEnabledSignal method', () => {
    expect(typeof service.isSoundEnabledSignal).toBe('function');
  });

  it('should have enableSound method', () => {
    expect(typeof service.enableSound).toBe('function');
  });

  it('should have disableSound method', () => {
    expect(typeof service.disableSound).toBe('function');
  });
});
