import { TestBed } from '@angular/core/testing';
import { PwaService } from '@core/services/infrastructure/pwa.service';

describe('PwaService', () => {
  let service: PwaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PwaService]
    });
    service = TestBed.inject(PwaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have promptInstall method', () => {
    expect(typeof service.promptInstall).toBe('function');
  });

  it('should have activateUpdate method', () => {
    expect(typeof service.activateUpdate).toBe('function');
  });

  it('should have share method', () => {
    expect(typeof service.share).toBe('function');
  });

  it('should have requestNotificationPermission method', () => {
    expect(typeof service.requestNotificationPermission).toBe('function');
  });

  it('should have showNotification method', () => {
    expect(typeof service.showNotification).toBe('function');
  });

  it('should have setAppBadge method', () => {
    expect(typeof service.setAppBadge).toBe('function');
  });

  it('should have clearAppBadge method', () => {
    expect(typeof service.clearAppBadge).toBe('function');
  });

  it('should have pickContacts method', () => {
    expect(typeof service.pickContacts).toBe('function');
  });

  it('should have requestWakeLock method', () => {
    expect(typeof service.requestWakeLock).toBe('function');
  });

  it('should have writeToClipboard method', () => {
    expect(typeof service.writeToClipboard).toBe('function');
  });

});
