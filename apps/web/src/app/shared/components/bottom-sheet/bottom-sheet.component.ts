import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  effect,
  model,
} from '@angular/core';

@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bottom-sheet.component.html',
  styleUrls: ['./bottom-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('backdropAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        style({ opacity: 1 }),
        animate('200ms ease-in', style({ opacity: 0 })),
      ]),
    ]),
    trigger('panelAnimation', [
      transition(':enter', [
        style({ transform: 'translateY(100%)' }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        style({ transform: 'translateY(0)' }),
        animate('300ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateY(100%)' })),
      ]),
    ]),
  ],
})
export class BottomSheetComponent {
  isOpen = model<boolean>(false);
  @Input() title = '';
  @Output() closed = new EventEmitter<void>();

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  close() {
    this.isOpen.set(false);
    this.closed.emit();
  }

  onBackdropClick() {
    this.close();
  }
}
