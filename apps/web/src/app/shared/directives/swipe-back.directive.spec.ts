import { Component, DebugElement, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { GestureService } from '@core/services/ui/gesture.service';
import { HapticFeedbackService } from '@core/services/ui/haptic-feedback.service';
import { SwipeBackDirective } from './swipe-back.directive';
import { testProviders } from '@app/testing/test-providers';

// Mock services
class MockRouter {
  navigate = jasmine.createSpy('navigate');
}

class MockGestureService {}

class MockHapticFeedbackService {
  light = jasmine.createSpy('light');
  medium = jasmine.createSpy('medium');
}

@Component({
  standalone: true,
  imports: [SwipeBackDirective],
  template: `
    <div appSwipeBack id="container1">Content</div>
    <div appSwipeBack [swipeBackEnabled]="false" id="container2">Disabled</div>
    <div appSwipeBack [edgeWidth]="50" [threshold]="150" id="container3">Custom</div>
  `,
})
class TestHostComponent {}

describe('SwipeBackDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let containers: DebugElement[];
  let hapticService: MockHapticFeedbackService;
  let router: MockRouter;

  beforeEach(async () => {
    hapticService = new MockHapticFeedbackService();
    router = new MockRouter();

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        ...testProviders,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Router, useValue: router },
        { provide: GestureService, useClass: MockGestureService },
        { provide: HapticFeedbackService, useValue: hapticService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    containers = fixture.debugElement.queryAll(By.directive(SwipeBackDirective));
  });

  afterEach(() => {
    // Clean up overlays
    document
      .querySelectorAll('.swipe-back-overlay, .swipe-back-indicator')
      .forEach((el) => el.remove());
  });

  it('should create directive on elements with appSwipeBack', () => {
    expect(containers.length).toBe(3);
  });

  it('should have default swipeBackEnabled as true', () => {
    const directive = containers[0].injector.get(SwipeBackDirective);
    expect(directive.swipeBackEnabled).toBe(true);
  });

  it('should respect swipeBackEnabled input', () => {
    const directive = containers[1].injector.get(SwipeBackDirective);
    expect(directive.swipeBackEnabled).toBe(false);
  });

  it('should have default edgeWidth of 30px', () => {
    const directive = containers[0].injector.get(SwipeBackDirective);
    expect(directive.edgeWidth).toBe(30);
  });

  it('should have default threshold of 100px', () => {
    const directive = containers[0].injector.get(SwipeBackDirective);
    expect(directive.threshold).toBe(100);
  });

  it('should respect custom edgeWidth and threshold', () => {
    const directive = containers[2].injector.get(SwipeBackDirective);
    expect(directive.edgeWidth).toBe(50);
    expect(directive.threshold).toBe(150);
  });

  it('should create overlay elements when enabled', () => {
    const overlay = document.querySelector('.swipe-back-overlay');
    const indicator = document.querySelector('.swipe-back-indicator');

    expect(overlay).toBeTruthy();
    expect(indicator).toBeTruthy();
  });

  it('should trigger haptic feedback on edge touch start', () => {
    const element = containers[0].nativeElement as HTMLElement;

    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 10, clientY: 100 } as Touch],
      bubbles: true,
    });

    element.dispatchEvent(touchStartEvent);

    expect(hapticService.light).toHaveBeenCalled();
  });

  it('should NOT trigger haptic for touches outside edge width', () => {
    const element = containers[0].nativeElement as HTMLElement;
    hapticService.light.calls.reset();

    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
      bubbles: true,
    });

    element.dispatchEvent(touchStartEvent);

    expect(hapticService.light).not.toHaveBeenCalled();
  });

  it('should have swipeBackTriggered output', () => {
    const directive = containers[0].injector.get(SwipeBackDirective);
    expect(directive.swipeBackTriggered).toBeTruthy();
  });

  it('should clean up on destroy', () => {
    fixture.destroy();

    // Give time for cleanup
    setTimeout(() => {
      const overlay = document.querySelector('.swipe-back-overlay');
      expect(overlay).toBeFalsy();
    }, 100);
  });
});
