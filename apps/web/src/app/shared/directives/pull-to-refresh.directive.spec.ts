import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { HapticFeedbackService } from '../../core/services/haptic-feedback.service';
import { PullToRefreshDirective } from './pull-to-refresh.directive';

/**
 * Unit Tests for PullToRefreshDirective
 * Validates security fix from Code Review:
 *   - Fix #3: Singleton pattern for styles (race condition prevention)
 */

// Test host component
@Component({
  template: `
    <div appPullToRefresh
         [pullToRefreshEnabled]="enabled"
         (refreshTriggered)="onRefresh($event)">
      Content
    </div>
  `,
  standalone: true,
  imports: [PullToRefreshDirective],
})
class TestHostComponent {
  enabled = true;
  onRefresh = jasmine.createSpy('onRefresh');
}

// Multiple instances test component
@Component({
  template: `
    <div appPullToRefresh>List 1</div>
    <div appPullToRefresh>List 2</div>
    <div appPullToRefresh>List 3</div>
  `,
  standalone: true,
  imports: [PullToRefreshDirective],
})
class MultipleInstancesComponent {}

describe('PullToRefreshDirective', () => {
  let mockHaptic: jasmine.SpyObj<HapticFeedbackService>;

  beforeEach(() => {
    // Clean up any existing style elements from previous tests
    const existingStyle = document.getElementById('pull-refresh-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Reset static state
    (PullToRefreshDirective as any).stylesInjected = false;
    (PullToRefreshDirective as any).instanceCount = 0;

    mockHaptic = jasmine.createSpyObj('HapticFeedbackService', [
      'light',
      'medium',
      'success',
    ]);
  });

  afterEach(() => {
    // Clean up
    const styleElement = document.getElementById('pull-refresh-styles');
    if (styleElement) {
      styleElement.remove();
    }

    // Reset static state
    (PullToRefreshDirective as any).stylesInjected = false;
    (PullToRefreshDirective as any).instanceCount = 0;
  });

  describe('Security Fix #3: Singleton Pattern for Styles', () => {
    it('should inject styles only once when single instance is created', fakeAsync(() => {
      TestBed.configureTestingModule({
        imports: [TestHostComponent],
        providers: [
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: HapticFeedbackService, useValue: mockHaptic },
        ],
      });

      const fixture = TestBed.createComponent(TestHostComponent);
      fixture.detectChanges();
      tick();

      const styleElements = document.querySelectorAll('#pull-refresh-styles');
      expect(styleElements.length).toBe(1);

      fixture.destroy();
    }));

    it('should inject styles only once when multiple instances are created', fakeAsync(() => {
      TestBed.configureTestingModule({
        imports: [MultipleInstancesComponent],
        providers: [
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: HapticFeedbackService, useValue: mockHaptic },
        ],
      });

      const fixture = TestBed.createComponent(MultipleInstancesComponent);
      fixture.detectChanges();
      tick();

      // Should have exactly ONE style element despite 3 directive instances
      const styleElements = document.querySelectorAll('#pull-refresh-styles');
      expect(styleElements.length).toBe(1);

      // Instance count should be 3
      expect((PullToRefreshDirective as any).instanceCount).toBe(3);

      fixture.destroy();
    }));

    it('should remove styles when last instance is destroyed', fakeAsync(() => {
      TestBed.configureTestingModule({
        imports: [TestHostComponent],
        providers: [
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: HapticFeedbackService, useValue: mockHaptic },
        ],
      });

      const fixture = TestBed.createComponent(TestHostComponent);
      fixture.detectChanges();
      tick();

      // Style should exist
      expect(document.getElementById('pull-refresh-styles')).toBeTruthy();

      // Destroy the component
      fixture.destroy();
      tick();

      // Style should be removed
      expect(document.getElementById('pull-refresh-styles')).toBeFalsy();

      // Static state should be reset
      expect((PullToRefreshDirective as any).stylesInjected).toBe(false);
      expect((PullToRefreshDirective as any).instanceCount).toBe(0);
    }));

    it('should not remove styles while other instances are still active', fakeAsync(() => {
      TestBed.configureTestingModule({
        imports: [MultipleInstancesComponent],
        providers: [
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: HapticFeedbackService, useValue: mockHaptic },
        ],
      });

      const fixture1 = TestBed.createComponent(MultipleInstancesComponent);
      fixture1.detectChanges();
      tick();

      // Create another component with directive
      const fixture2 = TestBed.createComponent(TestHostComponent);
      fixture2.detectChanges();
      tick();

      // Total 4 instances (3 from Multi + 1 from Single)
      expect((PullToRefreshDirective as any).instanceCount).toBe(4);

      // Destroy first fixture (3 instances)
      fixture1.destroy();
      tick();

      // Style should still exist (1 instance remaining)
      expect(document.getElementById('pull-refresh-styles')).toBeTruthy();
      expect((PullToRefreshDirective as any).instanceCount).toBe(1);

      // Destroy last fixture
      fixture2.destroy();
      tick();

      // Now style should be removed
      expect(document.getElementById('pull-refresh-styles')).toBeFalsy();
    }));

    it('should handle rapid create/destroy cycles without duplicating styles', fakeAsync(() => {
      TestBed.configureTestingModule({
        imports: [TestHostComponent],
        providers: [
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: HapticFeedbackService, useValue: mockHaptic },
        ],
      });

      // Simulate rapid navigation
      for (let i = 0; i < 10; i++) {
        const fixture = TestBed.createComponent(TestHostComponent);
        fixture.detectChanges();
        tick();

        const styleElements = document.querySelectorAll('#pull-refresh-styles');
        expect(styleElements.length).toBe(1);

        fixture.destroy();
        tick();
      }

      // After all destroy, no style should remain
      expect(document.getElementById('pull-refresh-styles')).toBeFalsy();
    }));
  });

  describe('Style Content Verification', () => {
    it('should inject correct keyframes animation', fakeAsync(() => {
      TestBed.configureTestingModule({
        imports: [TestHostComponent],
        providers: [
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: HapticFeedbackService, useValue: mockHaptic },
        ],
      });

      const fixture = TestBed.createComponent(TestHostComponent);
      fixture.detectChanges();
      tick();

      const styleElement = document.getElementById('pull-refresh-styles');
      expect(styleElement).toBeTruthy();
      expect(styleElement?.textContent).toContain('@keyframes pull-refresh-spin');
      expect(styleElement?.textContent).toContain('.pull-refresh-spinner.spinning');

      fixture.destroy();
    }));
  });

  describe('SSR Safety', () => {
    it('should not inject styles on server platform', fakeAsync(() => {
      TestBed.configureTestingModule({
        imports: [TestHostComponent],
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: HapticFeedbackService, useValue: mockHaptic },
        ],
      });

      const fixture = TestBed.createComponent(TestHostComponent);
      fixture.detectChanges();
      tick();

      // No style should be injected on server
      expect(document.getElementById('pull-refresh-styles')).toBeFalsy();

      fixture.destroy();
    }));
  });

  describe('Indicator Creation', () => {
    it('should create indicator element on init', fakeAsync(() => {
      TestBed.configureTestingModule({
        imports: [TestHostComponent],
        providers: [
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: HapticFeedbackService, useValue: mockHaptic },
        ],
      });

      const fixture = TestBed.createComponent(TestHostComponent);
      fixture.detectChanges();
      tick();

      const indicator = document.querySelector('.pull-refresh-indicator');
      expect(indicator).toBeTruthy();

      fixture.destroy();
      tick();

      // Indicator should be removed on destroy
      expect(document.querySelector('.pull-refresh-indicator')).toBeFalsy();
    }));
  });
});
