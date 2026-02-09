/**
 * Smart Tags Component - Unit Tests
 * Testing filtering, rendering, and animations
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { testProviders } from '@app/testing/test-providers';
import { SmartTagsComponent, SmartTag } from './smart-tags.component';

describe('SmartTagsComponent', () => {
  let component: SmartTagsComponent;
  let fixture: ComponentFixture<SmartTagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [...testProviders],
      imports: [SmartTagsComponent, BrowserAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SmartTagsComponent);
    component = fixture.componentInstance;
  });

  describe('Filtering', () => {
    it('should filter only active tags', () => {
      component.tags = [
        { icon: '🏔️', label: 'Terrain', condition: true },
        { icon: '🔋', label: 'Efficient', condition: false },
        { icon: '✨', label: 'New', condition: true },
      ];

      expect(component.activeTags.length).toBe(2);
      expect(component.activeTags[0].label).toBe('Terrain');
      expect(component.activeTags[1].label).toBe('New');
    });

    it('should return empty array if no tags', () => {
      component.tags = [];

      expect(component.activeTags.length).toBe(0);
    });

    it('should return empty array if all tags are inactive', () => {
      component.tags = [
        { icon: '🏔️', label: 'Terrain', condition: false },
        { icon: '🔋', label: 'Efficient', condition: false },
      ];

      expect(component.activeTags.length).toBe(0);
    });
  });

  describe('Rendering', () => {
    it('should render active tags', () => {
      component.tags = [{ icon: '✨', label: 'New', condition: true, color: 'green' }];
      fixture.detectChanges();

      const tagElement = fixture.nativeElement.querySelector('.tag-green');
      expect(tagElement).toBeTruthy();
      expect(tagElement.textContent).toContain('New');
      expect(tagElement.textContent).toContain('✨');
    });

    it('should not render inactive tags', () => {
      component.tags = [{ icon: '🏔️', label: 'Terrain', condition: false, color: 'blue' }];
      fixture.detectChanges();

      const tagElement = fixture.nativeElement.querySelector('.tag-blue');
      expect(tagElement).toBeFalsy();
    });

    it('should render container only if there are active tags', () => {
      component.tags = [{ icon: '🔋', label: 'Efficient', condition: false }];
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.smart-tags-container');
      expect(container).toBeFalsy();

      component.tags = [{ icon: '🔋', label: 'Efficient', condition: true }];
      fixture.detectChanges();

      const containerAfter = fixture.nativeElement.querySelector('.smart-tags-container');
      expect(containerAfter).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should apply correct color class', () => {
      component.tags = [{ icon: '✨', label: 'New', condition: true, color: 'orange' }];
      fixture.detectChanges();

      const tagElement = fixture.nativeElement.querySelector('[class*="tag-"]');
      expect(tagElement.classList.contains('tag-orange')).toBe(true);
    });

    it('should default to green color if not specified', () => {
      component.tags = [{ icon: '✨', label: 'New', condition: true }];
      fixture.detectChanges();

      const tagElement = fixture.nativeElement.querySelector('[class*="tag-"]');
      expect(tagElement.classList.contains('tag-green')).toBe(true);
    });
  });

  describe('Animations', () => {
    it('should trigger tag enter animation', (done) => {
      component.tags = [{ icon: '✨', label: 'New', condition: true }];
      fixture.detectChanges();

      // Animation should complete in ~300ms
      setTimeout(() => {
        const tagElement = fixture.nativeElement.querySelector('[class*="tag-"]');
        expect(tagElement).toBeTruthy();
        done();
      }, 350);
    });
  });

  describe('Edge Cases', () => {
    it('should handle mixed conditions correctly', () => {
      component.tags = [
        { icon: '🏔️', label: 'Terrain', condition: true },
        { icon: '🔋', label: 'Efficient', condition: false },
        { icon: '✨', label: 'New', condition: true },
        { icon: '🎵', label: 'Audio', condition: false },
        { icon: '🛡️', label: 'Insurance', condition: true },
      ];

      const activeTags = component.activeTags;
      expect(activeTags.length).toBe(3);
      expect(activeTags.map((t) => t.label)).toEqual(['Terrain', 'New', 'Insurance']);
    });

    it('should handle dynamic tag changes', () => {
      component.tags = [{ icon: '🏔️', label: 'Terrain', condition: true }];
      expect(component.activeTags.length).toBe(1);

      component.tags[0].condition = false;
      expect(component.activeTags.length).toBe(0);

      component.tags[0].condition = true;
      expect(component.activeTags.length).toBe(1);
    });
  });
});
