import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { BreakpointService, BREAKPOINTS } from './breakpoint.service';

describe('BreakpointService', () => {
  let service: BreakpointService;

  // Helper to create service with specific window width
  function createServiceWithWidth(width: number): BreakpointService {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });

    return TestBed.inject(BreakpointService);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
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
    const mobileService = createServiceWithWidth(375);
    expect(mobileService.isMobile()).toBe(true);
    expect(mobileService.isDesktop()).toBe(false);
  });

  it('should detect desktop viewport', () => {
    const desktopService = createServiceWithWidth(1440);
    expect(desktopService.isMobile()).toBe(false);
    expect(desktopService.isDesktop()).toBe(true);
  });

  it('should correctly identify current breakpoint', () => {
    // 800px is >= 768 (md) but < 1024 (lg), so current should be 'lg'
    // According to service logic:
    // if (w < sm=640) return 'sm'
    // if (w < md=768) return 'md'
    // if (w < lg=1024) return 'lg'  <-- 800 falls here
    // if (w < xl=1280) return 'xl'
    // else return '2xl'
    const testService = createServiceWithWidth(800);
    expect(testService.current()).toBe('lg');
  });

  it('should use isAtLeast helper correctly', () => {
    const testService = createServiceWithWidth(1024);
    expect(testService.isAtLeast('lg')).toBe(true);
    expect(testService.isAtLeast('xl')).toBe(false);
  });

  it('should use isBelow helper correctly', () => {
    const testService = createServiceWithWidth(768);
    expect(testService.isBelow('lg')).toBe(true);
    expect(testService.isBelow('md')).toBe(false);
  });

  it('should use isBetween helper correctly', () => {
    // 900px is >= 768 (md) and < 1024 (lg)
    const testService = createServiceWithWidth(900);
    // isBetween(md, lg) means >= 768 and < 1024 → true
    expect(testService.isBetween('md', 'lg')).toBe(true);
    // isBetween(lg, xl) means >= 1024 and < 1280 → false (900 < 1024)
    expect(testService.isBetween('lg', 'xl')).toBe(false);
  });

  it('should detect tablet viewport', () => {
    // Tablet is >= 768 and < 1024
    const tabletService = createServiceWithWidth(800);
    expect(tabletService.isTablet()).toBe(true);
    expect(tabletService.isMobile()).toBe(false);
    expect(tabletService.isDesktop()).toBe(false);
  });

  it('should detect small mobile viewport', () => {
    // Small mobile is < 640
    const smallMobileService = createServiceWithWidth(320);
    expect(smallMobileService.isSmallMobile()).toBe(true);
    expect(smallMobileService.isMobile()).toBe(true);
  });

  it('should detect large desktop viewport', () => {
    // Large desktop is >= 1280
    const largeDesktopService = createServiceWithWidth(1440);
    expect(largeDesktopService.isLargeDesktop()).toBe(true);
    expect(largeDesktopService.isDesktop()).toBe(true);
  });
});
