import { TestBed } from '@angular/core/testing';
import { BreakpointService, BREAKPOINTS } from './breakpoint.service';

describe('BreakpointService', () => {
  let service: BreakpointService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BreakpointService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have correct breakpoint values', () => {
    expect(BREAKPOINTS.sm).toBe(640);
    expect(BREAKPOINTS.md).toBe(768);
    expect(BREAKPOINTS.lg).toBe(1024);
    expect(BREAKPOINTS.xl).toBe(1280);
    expect(BREAKPOINTS['2xl']).toBe(1536);
  });

  it('should detect mobile viewport', () => {
    // Simulamos viewport móvil
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const newService = new BreakpointService();
    expect(newService.isMobile()).toBe(true);
    expect(newService.isDesktop()).toBe(false);
  });

  it('should detect desktop viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1440,
    });

    const newService = new BreakpointService();
    expect(newService.isMobile()).toBe(false);
    expect(newService.isDesktop()).toBe(true);
  });

  it('should correctly identify current breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    });

    const newService = new BreakpointService();
    expect(newService.current()).toBe('lg');
  });

  it('should use isAtLeast helper correctly', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const newService = new BreakpointService();
    expect(newService.isAtLeast('lg')).toBe(true);
    expect(newService.isAtLeast('xl')).toBe(false);
  });

  it('should use isBelow helper correctly', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const newService = new BreakpointService();
    expect(newService.isBelow('lg')).toBe(true);
    expect(newService.isBelow('md')).toBe(false);
  });

  it('should use isBetween helper correctly', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 900,
    });

    const newService = new BreakpointService();
    expect(newService.isBetween('md', 'lg')).toBe(false);
    expect(newService.isBetween('lg', 'xl')).toBe(true);
  });
});
