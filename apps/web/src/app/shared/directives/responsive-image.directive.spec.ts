import { ElementRef, Renderer2 } from '@angular/core';
import { ResponsiveImageDirective } from './responsive-image.directive';

describe('ResponsiveImageDirective', () => {
  let directive: ResponsiveImageDirective;
  let mockElementRef: ElementRef<HTMLImageElement>;
  let mockRenderer: Renderer2;
  let mockImg: HTMLImageElement;

  beforeEach(() => {
    mockImg = document.createElement('img');
    mockElementRef = new ElementRef(mockImg);
    mockRenderer = jasmine.createSpyObj('Renderer2', ['setAttribute']);
    directive = new ResponsiveImageDirective(mockElementRef, mockRenderer);
  });

  it('should create', () => {
    expect(directive).toBeTruthy();
  });

  it('should add lazy loading by default', () => {
    mockImg.setAttribute('src', 'https://example.com/image.jpg');
    directive.ngOnInit();

    expect(mockRenderer.setAttribute).toHaveBeenCalledWith(mockImg, 'loading', 'lazy');
  });

  it('should add async decoding by default', () => {
    mockImg.setAttribute('src', 'https://example.com/image.jpg');
    directive.ngOnInit();

    expect(mockRenderer.setAttribute).toHaveBeenCalledWith(mockImg, 'decoding', 'async');
  });

  it('should generate srcset for Unsplash images', () => {
    mockImg.setAttribute('src', 'https://images.unsplash.com/photo-123');
    directive.ngOnInit();

    expect(mockRenderer.setAttribute).toHaveBeenCalledWith(
      mockImg,
      'srcset',
      jasmine.stringContaining('w=400'),
    );
  });

  it('should not generate srcset for non-optimizable URLs', () => {
    mockImg.setAttribute('src', 'https://example.com/image.jpg');
    directive.ngOnInit();

    const srcsetCalls = (mockRenderer.setAttribute as jasmine.Spy).calls
      .all()
      .filter((call: { args: string[] }) => call.args[1] === 'srcset');
    expect(srcsetCalls.length).toBe(0);
  });

  it('should respect existing loading attribute', () => {
    mockImg.setAttribute('src', 'https://example.com/image.jpg');
    mockImg.setAttribute('loading', 'eager');
    directive.ngOnInit();

    const loadingCalls = (mockRenderer.setAttribute as jasmine.Spy).calls
      .all()
      .filter((call: { args: string[] }) => call.args[1] === 'loading');
    expect(loadingCalls.length).toBe(0);
  });

  it('should handle Supabase Storage URLs', () => {
    mockImg.setAttribute('src', 'https://abc.supabase.co/storage/v1/object/public/images/test.jpg');
    directive.ngOnInit();

    expect(mockRenderer.setAttribute).toHaveBeenCalledWith(
      mockImg,
      'srcset',
      jasmine.stringContaining('400w'),
    );
  });

  it('should use custom sizes attribute', () => {
    mockImg.setAttribute('src', 'https://images.unsplash.com/photo-123');
    directive.sizes = '(max-width: 768px) 90vw, 600px';
    directive.ngOnInit();

    expect(mockRenderer.setAttribute).toHaveBeenCalledWith(
      mockImg,
      'sizes',
      '(max-width: 768px) 90vw, 600px',
    );
  });
});
