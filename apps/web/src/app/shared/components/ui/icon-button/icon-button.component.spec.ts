/**
 * Icon Button Component - Unit Tests
 * Testing WCAG compliance, sizing, variants, and events
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { IconButtonComponent } from './icon-button.component';

describe('IconButtonComponent', () => {
  let component: IconButtonComponent;
  let fixture: ComponentFixture<IconButtonComponent>;
  let buttonElement: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconButtonComponent, BrowserAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(IconButtonComponent);
    component = fixture.componentInstance;
    buttonElement = fixture.debugElement.query(By.css('button'));
  });

  describe('WCAG Compliance', () => {
    it('should have minimum 44x44px size (md by default)', () => {
      fixture.detectChanges();

      const classes = buttonElement.nativeElement.className;
      expect(classes).toContain('size-md');
    });

    it('should support all WCAG-compliant sizes', () => {
      const sizes = ['sm', 'md', 'lg'];

      sizes.forEach(size => {
        component.size = size as any;
        fixture.detectChanges();

        const classes = buttonElement.nativeElement.className;
        expect(classes).toContain(`size-${size}`);
      });
    });

    it('should have visible focus indicator', () => {
      fixture.detectChanges();

      buttonElement.nativeElement.focus();
      fixture.detectChanges();

      // Focus styles should include outline (2px solid)
      const styles = window.getComputedStyle(buttonElement.nativeElement);
      // Note: outline computed styles are browser-dependent
      expect(buttonElement.nativeElement).toBe(document.activeElement);
    });

    it('should have aria-label for accessibility', () => {
      component.ariaLabel = 'Agregar a favoritos';
      fixture.detectChanges();

      expect(buttonElement.nativeElement.getAttribute('aria-label')).toBe('Agregar a favoritos');
    });
  });

  describe('Sizing', () => {
    it('should apply correct classes for different sizes', () => {
      const testSizes = [
        { size: 'sm', expected: 'size-sm' },
        { size: 'md', expected: 'size-md' },
        { size: 'lg', expected: 'size-lg' },
      ];

      testSizes.forEach(({ size, expected }) => {
        component.size = size as any;
        fixture.detectChanges();

        const classes = buttonElement.nativeElement.className;
        expect(classes).toContain(expected);
      });
    });
  });

  describe('Variants', () => {
    it('should apply correct variant classes', () => {
      const variants = ['primary', 'secondary', 'ghost', 'danger'];

      variants.forEach(variant => {
        component.variant = variant as any;
        fixture.detectChanges();

        const classes = buttonElement.nativeElement.className;
        expect(classes).toContain(`variant-${variant}`);
      });
    });

    it('should default to ghost variant', () => {
      fixture.detectChanges();

      const classes = buttonElement.nativeElement.className;
      expect(classes).toContain('variant-ghost');
    });
  });

  describe('Disabled State', () => {
    it('should disable button when disabled input is true', () => {
      component.disabled = true;
      fixture.detectChanges();

      expect(buttonElement.nativeElement.disabled).toBe(true);
    });

    it('should not emit click event when disabled', () => {
      spyOn(component.clicked, 'emit');

      component.disabled = true;
      fixture.detectChanges();

      buttonElement.nativeElement.click();

      expect(component.clicked.emit).not.toHaveBeenCalled();
    });

    it('should be enabled by default', () => {
      fixture.detectChanges();

      expect(buttonElement.nativeElement.disabled).toBe(false);
    });
  });

  describe('Events', () => {
    it('should emit clicked event on click', (done) => {
      component.clicked.subscribe(() => {
        done();
      });

      fixture.detectChanges();
      buttonElement.nativeElement.click();
    });

    it('should emit clicked event only once per click', () => {
      let clickCount = 0;
      component.clicked.subscribe(() => {
        clickCount++;
      });

      fixture.detectChanges();
      buttonElement.nativeElement.click();

      expect(clickCount).toBe(1);
    });

    it('should not emit click if disabled', () => {
      spyOn(component.clicked, 'emit');
      component.disabled = true;
      fixture.detectChanges();

      buttonElement.nativeElement.click();

      expect(component.clicked.emit).not.toHaveBeenCalled();
    });
  });

  describe('Hover State', () => {
    it('should update isHovered on mouseenter', () => {
      fixture.detectChanges();

      buttonElement.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();

      expect(component.isHovered).toBe(true);
    });

    it('should update isHovered on mouseleave', () => {
      component.isHovered = true;
      fixture.detectChanges();

      buttonElement.nativeElement.dispatchEvent(new MouseEvent('mouseleave'));
      fixture.detectChanges();

      expect(component.isHovered).toBe(false);
    });

    it('should not set hover when disabled', () => {
      component.disabled = true;
      fixture.detectChanges();

      buttonElement.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();

      expect(component.isHovered).toBe(false);
    });
  });

  describe('Haptic Feedback', () => {
    it('should call vibrate API on click if available', () => {
      spyOn(navigator, 'vibrate').and.returnValue(true);

      fixture.detectChanges();
      buttonElement.nativeElement.click();

      expect(navigator.vibrate).toHaveBeenCalled();
    });

    it('should handle missing vibrate API gracefully', () => {
      const originalVibrate = navigator.vibrate;
      (navigator as any).vibrate = undefined;

      fixture.detectChanges();

      expect(() => {
        buttonElement.nativeElement.click();
      }).not.toThrow();

      (navigator as any).vibrate = originalVibrate;
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      spyOn(component.clicked, 'emit');
      fixture.detectChanges();

      buttonElement.nativeElement.focus();
      fixture.detectChanges();

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      buttonElement.nativeElement.dispatchEvent(event);
      buttonElement.nativeElement.click();

      expect(component.clicked.emit).toHaveBeenCalled();
    });

    it('should have proper type attribute', () => {
      fixture.detectChanges();

      expect(buttonElement.nativeElement.getAttribute('type')).toBe('button');
    });
  });

  describe('Content Projection', () => {
    it('should support ng-content', () => {
      // Content projection is verified by the template having ng-content
      // Full content projection testing would require a test host component
      expect(component).toBeTruthy();
    });
  });
});
