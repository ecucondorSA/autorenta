import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, ViewChild } from '@angular/core';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { ErrorBoundaryComponent } from './error-boundary.component';

// Mock LoggerService
const mockLogger = {
  error: jasmine.createSpy('error'),
  warn: jasmine.createSpy('warn'),
  info: jasmine.createSpy('info'),
  debug: jasmine.createSpy('debug'),
};

// Host component for testing
@Component({
  template: `
    <app-error-boundary context="Test Context" [showRetry]="showRetry" [showDetails]="showDetails">
      <div class="test-content">Test Content</div>
    </app-error-boundary>
  `,
  standalone: true,
  imports: [ErrorBoundaryComponent],
})
class TestHostComponent {
  @ViewChild(ErrorBoundaryComponent) errorBoundary!: ErrorBoundaryComponent;
  showRetry = true;
  showDetails = false;
}

describe('ErrorBoundaryComponent', () => {
  let component: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let errorBoundary: ErrorBoundaryComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [{ provide: LoggerService, useValue: mockLogger }],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    errorBoundary = component.errorBoundary;
  });

  it('should create', () => {
    expect(errorBoundary).toBeTruthy();
  });

  it('should display content when no error', () => {
    const content = fixture.nativeElement.querySelector('.test-content');
    expect(content).toBeTruthy();
    expect(content.textContent).toContain('Test Content');
  });

  it('should display fallback UI when error is captured', () => {
    errorBoundary.captureError(new Error('Test error'));
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector('.test-content');
    expect(content).toBeNull();

    const errorUI = fixture.nativeElement.querySelector('[role="alert"]');
    expect(errorUI).toBeTruthy();
  });

  it('should show retry button when showRetry is true', () => {
    errorBoundary.captureError(new Error('Test error'));
    fixture.detectChanges();

    const retryButton = fixture.nativeElement.querySelector('button');
    expect(retryButton).toBeTruthy();
    expect(retryButton.textContent).toContain('Reintentar');
  });

  it('should reset state when retry is called', () => {
    errorBoundary.captureError(new Error('Test error'));
    fixture.detectChanges();

    expect(errorBoundary.hasError()).toBeTrue();

    errorBoundary.retry();
    fixture.detectChanges();

    expect(errorBoundary.hasError()).toBeFalse();
    const content = fixture.nativeElement.querySelector('.test-content');
    expect(content).toBeTruthy();
  });

  it('should handle string errors', () => {
    errorBoundary.captureError('String error');
    expect(errorBoundary.error()?.message).toBe('String error');
  });

  it('should show network error message for network errors', () => {
    errorBoundary.captureError(new Error('Network request failed'));
    expect(errorBoundary.userMessage()).toContain('conexión');
  });

  it('should show permission error message for auth errors', () => {
    errorBoundary.captureError(new Error('Unauthorized access'));
    expect(errorBoundary.userMessage()).toContain('permisos');
  });

  it('should log error when captured', () => {
    errorBoundary.captureError(new Error('Test error'));
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should log info when retrying', () => {
    errorBoundary.captureError(new Error('Test error'));
    errorBoundary.retry();
    expect(mockLogger.info).toHaveBeenCalled();
  });
});
