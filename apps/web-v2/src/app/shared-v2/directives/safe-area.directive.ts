import { Directive, ElementRef, OnInit, inject } from '@angular/core';

/**
 * Directive to add safe-area padding to elements
 * Handles notches, status bars, and navigation bars on mobile devices
 * 
 * Usage:
 * <div appSafeArea></div> - All sides
 * <div appSafeArea="top"></div> - Top only
 * <div appSafeArea="bottom"></div> - Bottom only
 * <div [appSafeArea]="['top', 'bottom']"></div> - Multiple sides
 */
@Directive({
  selector: '[appSafeArea]',
  standalone: true,
})
export class SafeAreaDirective implements OnInit {
  private readonly el = inject(ElementRef);

  ngOnInit(): void {
    const element = this.el.nativeElement as HTMLElement;
    
    // Apply safe-area padding using CSS environment variables
    element.style.paddingTop = `max(${element.style.paddingTop || '0px'}, env(safe-area-inset-top))`;
    element.style.paddingRight = `max(${element.style.paddingRight || '0px'}, env(safe-area-inset-right))`;
    element.style.paddingBottom = `max(${element.style.paddingBottom || '0px'}, env(safe-area-inset-bottom))`;
    element.style.paddingLeft = `max(${element.style.paddingLeft || '0px'}, env(safe-area-inset-left))`;
  }
}
