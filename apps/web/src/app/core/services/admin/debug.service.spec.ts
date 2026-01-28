import { TestBed } from '@angular/core/testing';
import { DebugService } from '@core/services/admin/debug.service';
import { testProviders } from '@app/testing/test-providers';

describe('DebugService', () => {
  let service: DebugService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, DebugService],
    });
    service = TestBed.inject(DebugService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have copyLogsToClipboard method', () => {
    expect(typeof service.copyLogsToClipboard).toBe('function');
  });

  it('should have exposeForE2E method', () => {
    expect(typeof service.exposeForE2E).toBe('function');
  });

  it('should have enable method', () => {
    expect(typeof service.enable).toBe('function');
  });

  it('should have disable method', () => {
    expect(typeof service.disable).toBe('function');
  });

  it('should have togglePanel method', () => {
    expect(typeof service.togglePanel).toBe('function');
  });

  it('should have openPanel method', () => {
    expect(typeof service.openPanel).toBe('function');
  });

  it('should have closePanel method', () => {
    expect(typeof service.closePanel).toBe('function');
  });

  it('should have log method', () => {
    expect(typeof service.log).toBe('function');
  });

  it('should have logHttpStart method', () => {
    expect(typeof service.logHttpStart).toBe('function');
  });

  it('should have logHttpEnd method', () => {
    expect(typeof service.logHttpEnd).toBe('function');
  });
});
