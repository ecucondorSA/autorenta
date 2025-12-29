import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TouchFeedbackDirective } from './touch-feedback.directive';
import { HapticFeedbackService } from '@core/services/ui/haptic-feedback.service';

// Mock HapticFeedbackService
class MockHapticFeedbackService {
  lightCalled = false;

  light(): void {
    this.lightCalled = true;
  }

  medium(): void {}
  heavy(): void {}
}

@Component({
  standalone: true,
  imports: [TouchFeedbackDirective],
  template: `
    <ion-button id="btn1">Default Button</ion-button>
    <ion-button id="btn2" [appDisableHaptic]="true">Disabled Haptic</ion-button>
  `,
})
class TestHostComponent {}

describe('TouchFeedbackDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let buttons: DebugElement[];
  let hapticService: MockHapticFeedbackService;

  beforeEach(async () => {
    hapticService = new MockHapticFeedbackService();

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [{ provide: HapticFeedbackService, useValue: hapticService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    buttons = fixture.debugElement.queryAll(By.css('ion-button'));
  });

  it('should create directive on ion-button elements', () => {
    expect(buttons.length).toBe(2);
    expect(buttons[0].injector.get(TouchFeedbackDirective)).toBeTruthy();
  });

  it('should call haptic.light() on click by default', () => {
    const button = buttons[0];
    button.triggerEventHandler('click', null);

    expect(hapticService.lightCalled).toBe(true);
  });

  it('should NOT call haptic.light() when appDisableHaptic is true', () => {
    const button = buttons[1];
    hapticService.lightCalled = false;

    button.triggerEventHandler('click', null);

    expect(hapticService.lightCalled).toBe(false);
  });

  it('should have default appDisableHaptic as false', () => {
    const directive = buttons[0].injector.get(TouchFeedbackDirective);
    expect(directive.appDisableHaptic).toBe(false);
  });
});
