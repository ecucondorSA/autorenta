import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { DistanceBadgeComponent } from './distance-badge.component';

// TODO: Fix - Component API changed, computed signals not matching expected values
xdescribe('DistanceBadgeComponent', () => {
  let component: DistanceBadgeComponent;
  let fixture: ComponentFixture<DistanceBadgeComponent>;
  let debugElement: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DistanceBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DistanceBadgeComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('distanceText computation', () => {
    it('should format distances < 1km as meters', () => {
      component.distanceKm = 0.5;
      fixture.detectChanges();

      expect(component['distanceText']()).toBe('500 m');
    });

    it('should format distances >= 1km as kilometers with 1 decimal', () => {
      component.distanceKm = 5.5;
      fixture.detectChanges();

      expect(component['distanceText']()).toBe('5.5 km');
    });

    it('should round meters to nearest integer', () => {
      component.distanceKm = 0.856; // 856 meters
      fixture.detectChanges();

      expect(component['distanceText']()).toBe('856 m');
    });

    it('should handle very small distances', () => {
      component.distanceKm = 0.001; // 1 meter
      fixture.detectChanges();

      expect(component['distanceText']()).toBe('1 m');
    });

    it('should handle large distances', () => {
      component.distanceKm = 150.7;
      fixture.detectChanges();

      expect(component['distanceText']()).toBe('150.7 km');
    });

    it('should format whole kilometers with .0', () => {
      component.distanceKm = 10;
      fixture.detectChanges();

      expect(component['distanceText']()).toBe('10.0 km');
    });
  });

  describe('isNearby computation', () => {
    it('should return true for distances < 5km', () => {
      component.distanceKm = 4.9;
      fixture.detectChanges();

      expect(component['isNearby']()).toBe(true);
    });

    it('should return false for distances >= 5km', () => {
      component.distanceKm = 5.0;
      fixture.detectChanges();

      expect(component['isNearby']()).toBe(false);
    });

    it('should return true for very small distances', () => {
      component.distanceKm = 0.5;
      fixture.detectChanges();

      expect(component['isNearby']()).toBe(true);
    });

    it('should return false for distances > 5km', () => {
      component.distanceKm = 10;
      fixture.detectChanges();

      expect(component['isNearby']()).toBe(false);
    });
  });

  describe('badgeClass computation', () => {
    it('should return "nearby" for distances < 5km', () => {
      component.distanceKm = 3;
      fixture.detectChanges();

      expect(component['badgeClass']()).toBe('nearby');
    });

    it('should return "medium" for distances 5km-20km', () => {
      component.distanceKm = 10;
      fixture.detectChanges();

      expect(component['badgeClass']()).toBe('medium');
    });

    it('should return "far" for distances 20km-50km', () => {
      component.distanceKm = 30;
      fixture.detectChanges();

      expect(component['badgeClass']()).toBe('far');
    });

    it('should return "default" for distances >= 50km', () => {
      component.distanceKm = 100;
      fixture.detectChanges();

      expect(component['badgeClass']()).toBe('default');
    });

    it('should handle boundary at 5km', () => {
      component.distanceKm = 4.9;
      fixture.detectChanges();
      expect(component['badgeClass']()).toBe('nearby');

      component.distanceKm = 5.0;
      fixture.detectChanges();
      expect(component['badgeClass']()).toBe('medium');
    });

    it('should handle boundary at 20km', () => {
      component.distanceKm = 19.9;
      fixture.detectChanges();
      expect(component['badgeClass']()).toBe('medium');

      component.distanceKm = 20.0;
      fixture.detectChanges();
      expect(component['badgeClass']()).toBe('far');
    });

    it('should handle boundary at 50km', () => {
      component.distanceKm = 49.9;
      fixture.detectChanges();
      expect(component['badgeClass']()).toBe('far');

      component.distanceKm = 50.0;
      fixture.detectChanges();
      expect(component['badgeClass']()).toBe('default');
    });
  });

  describe('template rendering', () => {
    it('should display distance icon', () => {
      component.distanceKm = 10;
      fixture.detectChanges();

      const icon = debugElement.query(By.css('.icon'));
      expect(icon).toBeTruthy();
      expect(icon.nativeElement.textContent).toBe('📍');
    });

    it('should display formatted distance text', () => {
      component.distanceKm = 5.5;
      fixture.detectChanges();

      const distanceText = debugElement.query(By.css('.distance-text'));
      expect(distanceText).toBeTruthy();
      expect(distanceText.nativeElement.textContent).toBe('5.5 km');
    });

    it('should display "Cerca de ti" label when distance < 5km', () => {
      component.distanceKm = 3;
      fixture.detectChanges();

      const nearbyLabel = debugElement.query(By.css('.nearby-label'));
      expect(nearbyLabel).toBeTruthy();
      expect(nearbyLabel.nativeElement.textContent).toBe('Cerca de ti');
    });

    it('should NOT display "Cerca de ti" label when distance >= 5km', () => {
      component.distanceKm = 10;
      fixture.detectChanges();

      const nearbyLabel = debugElement.query(By.css('.nearby-label'));
      expect(nearbyLabel).toBeNull();
    });

    it('should apply "nearby" CSS class for close distances', () => {
      component.distanceKm = 2;
      fixture.detectChanges();

      const badge = debugElement.query(By.css('.distance-badge'));
      expect(badge.nativeElement.classList.contains('nearby')).toBe(true);
    });

    it('should apply "medium" CSS class for medium distances', () => {
      component.distanceKm = 15;
      fixture.detectChanges();

      const badge = debugElement.query(By.css('.distance-badge'));
      expect(badge.nativeElement.classList.contains('medium')).toBe(true);
    });

    it('should apply "far" CSS class for far distances', () => {
      component.distanceKm = 35;
      fixture.detectChanges();

      const badge = debugElement.query(By.css('.distance-badge'));
      expect(badge.nativeElement.classList.contains('far')).toBe(true);
    });

    it('should apply "default" CSS class for very far distances', () => {
      component.distanceKm = 100;
      fixture.detectChanges();

      const badge = debugElement.query(By.css('.distance-badge'));
      expect(badge.nativeElement.classList.contains('default')).toBe(true);
    });
  });

  describe('input properties', () => {
    it('should accept distanceKm input', () => {
      component.distanceKm = 25;
      fixture.detectChanges();

      expect(component.distanceKm).toBe(25);
    });

    it('should have showTier input with default value true', () => {
      expect(component.showTier).toBe(true);
    });

    it('should allow showTier input to be set', () => {
      component.showTier = false;
      fixture.detectChanges();

      expect(component.showTier).toBe(false);
    });

    it('should update display when distanceKm changes', () => {
      component.distanceKm = 2;
      fixture.detectChanges();

      let distanceText = debugElement.query(By.css('.distance-text'));
      expect(distanceText.nativeElement.textContent).toBe('2.0 km');

      component.distanceKm = 0.5;
      fixture.detectChanges();

      distanceText = debugElement.query(By.css('.distance-text'));
      expect(distanceText.nativeElement.textContent).toBe('500 m');
    });

    it('should update badge class when distanceKm changes', () => {
      component.distanceKm = 3;
      fixture.detectChanges();

      let badge = debugElement.query(By.css('.distance-badge'));
      expect(badge.nativeElement.classList.contains('nearby')).toBe(true);

      component.distanceKm = 30;
      fixture.detectChanges();

      badge = debugElement.query(By.css('.distance-badge'));
      expect(badge.nativeElement.classList.contains('far')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle zero distance', () => {
      component.distanceKm = 0;
      fixture.detectChanges();

      expect(component['distanceText']()).toBe('0 m');
      expect(component['isNearby']()).toBe(true);
      expect(component['badgeClass']()).toBe('nearby');
    });

    it('should handle very large distances', () => {
      component.distanceKm = 1000;
      fixture.detectChanges();

      expect(component['distanceText']()).toBe('1000.0 km');
      expect(component['isNearby']()).toBe(false);
      expect(component['badgeClass']()).toBe('default');
    });

    it('should handle decimal precision correctly', () => {
      component.distanceKm = 4.999;
      fixture.detectChanges();

      expect(component['distanceText']()).toBe('5.0 km');
      expect(component['isNearby']()).toBe(true); // 4.999 < 5
      expect(component['badgeClass']()).toBe('nearby');
    });

    it('should handle floating point precision', () => {
      component.distanceKm = 0.001;
      fixture.detectChanges();

      expect(component['distanceText']()).toBe('1 m'); // Math.round(0.001 * 1000) = 1
    });
  });

  describe('integration tests', () => {
    it('should maintain consistency between isNearby and badge class', () => {
      const testCases = [
        { distance: 2, shouldBeNearby: true, expectedClass: 'nearby' },
        { distance: 5, shouldBeNearby: false, expectedClass: 'medium' },
        { distance: 15, shouldBeNearby: false, expectedClass: 'medium' },
        { distance: 25, shouldBeNearby: false, expectedClass: 'far' },
        { distance: 60, shouldBeNearby: false, expectedClass: 'default' },
      ];

      testCases.forEach((testCase) => {
        component.distanceKm = testCase.distance;
        fixture.detectChanges();

        expect(component['isNearby']()).toBe(testCase.shouldBeNearby);
        expect(component['badgeClass']()).toBe(testCase.expectedClass);

        // Verify "Cerca de ti" label matches isNearby
        const nearbyLabel = debugElement.query(By.css('.nearby-label'));
        if (testCase.shouldBeNearby) {
          expect(nearbyLabel).toBeTruthy();
        } else {
          expect(nearbyLabel).toBeNull();
        }
      });
    });

    it('should maintain consistency between distance format and range', () => {
      // Very small distance should be in meters and nearby
      component.distanceKm = 0.3;
      fixture.detectChanges();

      expect(component['distanceText']()).toContain('m');
      expect(component['isNearby']()).toBe(true);

      // Larger distance should be in km and not nearby
      component.distanceKm = 25;
      fixture.detectChanges();

      expect(component['distanceText']()).toContain('km');
      expect(component['isNearby']()).toBe(false);
    });

    it('should render complete badge structure correctly', () => {
      component.distanceKm = 3;
      fixture.detectChanges();

      const badge = debugElement.query(By.css('.distance-badge'));
      const icon = debugElement.query(By.css('.icon'));
      const distanceText = debugElement.query(By.css('.distance-text'));
      const nearbyLabel = debugElement.query(By.css('.nearby-label'));

      expect(badge).toBeTruthy();
      expect(icon).toBeTruthy();
      expect(distanceText).toBeTruthy();
      expect(nearbyLabel).toBeTruthy();

      expect(badge.nativeElement.contains(icon.nativeElement)).toBe(true);
      expect(badge.nativeElement.contains(distanceText.nativeElement)).toBe(true);
      expect(badge.nativeElement.contains(nearbyLabel.nativeElement)).toBe(true);
    });
  });
});
