import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';

@Directive({
  selector: '[app3dTilt]',
  standalone: true,
})
export class Tilt3dDirective {
  @Input() maxRotation = 10; // Max rotation in degrees
  @Input() scale = 1.05; // Scale on hover

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
  ) {
    this.renderer.setStyle(this.el.nativeElement, 'transition', 'transform 0.1s ease-out');
    this.renderer.setStyle(this.el.nativeElement, 'transform-style', 'preserve-3d');
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const rect = this.el.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Calculate percentages (-1 to 1)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate rotation
    // Rotate Y (horizontal movement) - inverted for natural feel
    const rotateY = ((x - centerX) / centerX) * this.maxRotation;
    // Rotate X (vertical movement) - inverted (top moves back when mouse is up)
    const rotateX = -((y - centerY) / centerY) * this.maxRotation;

    const transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${this.scale}, ${this.scale}, ${this.scale})`;
    this.renderer.setStyle(this.el.nativeElement, 'transform', transform);
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.renderer.setStyle(this.el.nativeElement, 'transition', 'transform 0.5s ease-out');
    this.renderer.setStyle(
      this.el.nativeElement,
      'transform',
      'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)',
    );
  }

  @HostListener('mouseenter')
  onMouseEnter() {
    this.renderer.setStyle(this.el.nativeElement, 'transition', 'transform 0.1s ease-out');
  }
}
