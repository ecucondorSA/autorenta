import {
  trigger,
  transition,
  style,
  query,
  animate,
  group,
  animateChild,
} from '@angular/animations';

export const routeAnimations = trigger('routeAnimations', [
  // Transición genérica entre cualquier página que tenga data: { animation: '...' }
  transition('* <=> *', [
    style({ position: 'relative' }),
    query(
      ':enter, :leave',
      [
        style({
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
        }),
      ],
      { optional: true },
    ),
    query(':enter', [style({ opacity: 0, transform: 'translateY(10px)' })], {
      optional: true,
    }),
    query(':leave', [style({ opacity: 1, transform: 'translateY(0)' }), animateChild()], {
      optional: true,
    }),
    group([
      query(
        ':leave',
        [animate('200ms ease-out', style({ opacity: 0, transform: 'translateY(-10px)' }))],
        { optional: true },
      ),
      query(
        ':enter',
        [animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))],
        { optional: true },
      ),
    ]),
    query(':enter', animateChild(), { optional: true }),
  ]),
]);
