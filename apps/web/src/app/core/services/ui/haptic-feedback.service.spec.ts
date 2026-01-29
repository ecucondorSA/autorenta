import { TestBed } from '@angular/core/testing';
import { HapticFeedbackService } from '@core/services/ui/haptic-feedback.service';
import { testProviders } from '@app/testing/test-providers';

describe('HapticFeedbackService', () => {
  let service: HapticFeedbackService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, HapticFeedbackService],
    });
    service = TestBed.inject(HapticFeedbackService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have light method', () => {
    expect(typeof service.light).toBe('function');
  });

  it('should have medium method', () => {
    expect(typeof service.medium).toBe('function');
  });

  it('should have heavy method', () => {
    expect(typeof service.heavy).toBe('function');
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

  it('should have selection method', () => {
    expect(typeof service.selection).toBe('function');
  });

  it('should have custom method', () => {
    expect(typeof service.custom).toBe('function');
  });

  it('should have setEnabled method', () => {
    expect(typeof service.setEnabled).toBe('function');
  });

  it('should have isAvailable method', () => {
    expect(typeof service.isAvailable).toBe('function');
  });
});
