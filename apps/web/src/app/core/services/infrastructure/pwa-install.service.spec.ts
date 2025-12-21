import { TestBed } from '@angular/core/testing';
import { PwaInstallService } from '@core/services/infrastructure/pwa-install.service';

describe('PwaInstallService', () => {
  let service: PwaInstallService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PwaInstallService]
    });
    service = TestBed.inject(PwaInstallService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have promptInstall method', () => {
    expect(typeof service.promptInstall).toBe('function');
  });

  it('should have dismissPrompt method', () => {
    expect(typeof service.dismissPrompt).toBe('function');
  });

  it('should have getInstallInstructions method', () => {
    expect(typeof service.getInstallInstructions).toBe('function');
  });

  it('should have getPlatformCapabilities method', () => {
    expect(typeof service.getPlatformCapabilities).toBe('function');
  });

});
