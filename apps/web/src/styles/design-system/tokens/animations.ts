/**
 * Design System - Animation Tokens
 * Centralized animation timing and Angular animation triggers
 */
import { trigger, transition, style, animate, state } from '@angular/animations';

export const AnimationTimings = {
  instant: 150,
  fast: 200,
  normal: 300,
  slow: 500,
  verySlow: 800,
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

export const fadeInAnimation = trigger('fadeIn', [
  transition(':enter', [style({ opacity: 0 }), animate('300ms ease-out', style({ opacity: 1 }))]),
]);

export const fadeOutAnimation = trigger('fadeOut', [
  transition(':leave', [animate('300ms ease-in', style({ opacity: 0 }))]),
]);

export const scaleUpOnHoverAnimation = trigger('scaleOnHover', [
  state('normal', style({ transform: 'scale(1)' })),
  state('hover', style({ transform: 'scale(1.05)' })),
  transition('normal <=> hover', animate('200ms cubic-bezier(0.68, -0.55, 0.265, 1.55)')),
]);

export const scaleInAnimation = trigger('scaleIn', [
  transition(':enter', [
    style({ transform: 'scale(0.8)', opacity: 0 }),
    animate(
      '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      style({ transform: 'scale(1)', opacity: 1 }),
    ),
  ]),
]);

export const slideInFromBottom = trigger('slideInBottom', [
  transition(':enter', [
    style({ transform: 'translateY(20px)', opacity: 0 }),
    animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 })),
  ]),
]);

export const slideInFromRight = trigger('slideInRight', [
  transition(':enter', [
    style({ transform: 'translateX(20px)', opacity: 0 }),
    animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 })),
  ]),
]);

export const progressBarAnimation = trigger('progressBar', [
  transition('* => *', [
    style({ width: '0%' }),
    animate('500ms cubic-bezier(0.34, 1.56, 0.64, 1)'),
  ]),
]);

export function getStaggerDelay(index: number, baseDelay: number = 50): string {
  return index * baseDelay + 'ms';
}

export const animationCSSVariables = {
  '--duration-instant': '150ms',
  '--duration-fast': '200ms',
  '--duration-normal': '300ms',
  '--duration-slow': '500ms',
  '--easing-spring': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  '--easing-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};
