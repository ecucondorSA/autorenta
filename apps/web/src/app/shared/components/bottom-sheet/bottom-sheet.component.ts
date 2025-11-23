import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  inject,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export type BottomSheetHeight = 'peek' | 'half' | 'full';

@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bottom-sheet.component.html',
  styleUrls: ['./bottom-sheet.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheetComponent implements OnInit, OnDestroy {
  @Input() isOpen = signal(false);
  @Input() initialHeight: BottomSheetHeight = 'peek';
  @Input() showDragHandle = true;
  @Input() peekHeight = '180px'; // Height showing 1.5 cards

  @Output() sheetHeightChange = new EventEmitter<BottomSheetHeight>();
  @Output() closeSheet = new EventEmitter<void>();

  @ViewChild('sheet') sheetRef?: ElementRef<HTMLDivElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly currentHeight = signal<BottomSheetHeight>(this.initialHeight);
  readonly isDragging = signal(false);
  readonly startY = signal(0);
  readonly currentY = signal(0);

  readonly heightClass = computed(() => {
    const heights = {
      peek: 'h-[180px]',
      half: 'h-[50vh]',
      full: 'h-[90vh]',
    };
    return heights[this.currentHeight()];
  });

  private touchStartY = 0;
  private touchCurrentY = 0;

  ngOnInit(): void {
    if (this.isBrowser) {
      this.setupTouchListeners();
    }
  }

  ngOnDestroy(): void {
    this.removeTouchListeners();
  }

  private setupTouchListeners(): void {
    // Will be handled by template event bindings
  }

  private removeTouchListeners(): void {
    // Cleanup handled by Angular
  }

  onDragStart(event: TouchEvent | MouseEvent): void {
    if (!this.isBrowser) return;
    this.isDragging.set(true);
    const y = 'touches' in event ? event.touches[0].clientY : event.clientY;
    this.startY.set(y);
    this.touchStartY = y;
    event.preventDefault();
  }

  onDragMove(event: TouchEvent | MouseEvent): void {
    if (!this.isDragging() || !this.isBrowser) return;
    const y = 'touches' in event ? event.touches[0].clientY : event.clientY;
    this.currentY.set(y);
    this.touchCurrentY = y;
    event.preventDefault();
  }

  onDragEnd(): void {
    if (!this.isBrowser) return;
    this.isDragging.set(false);

    const deltaY = this.touchCurrentY - this.touchStartY;
    const threshold = 50; // Minimum drag distance to trigger height change

    if (Math.abs(deltaY) < threshold) {
      // Small movement, toggle between peek and half
      if (this.currentHeight() === 'peek') {
        this.setHeight('half');
      } else if (this.currentHeight() === 'half') {
        this.setHeight('peek');
      }
      return;
    }

    // Determine new height based on drag direction
    if (deltaY < -threshold) {
      // Dragged up
      if (this.currentHeight() === 'peek') {
        this.setHeight('half');
      } else if (this.currentHeight() === 'half') {
        this.setHeight('full');
      }
    } else if (deltaY > threshold) {
      // Dragged down
      if (this.currentHeight() === 'full') {
        this.setHeight('half');
      } else if (this.currentHeight() === 'half') {
        this.setHeight('peek');
      } else {
        this.closeSheet.emit();
      }
    }

    this.startY.set(0);
    this.currentY.set(0);
  }

  setHeight(height: BottomSheetHeight): void {
    this.currentHeight.set(height);
    this.sheetHeightChange.emit(height);
  }

  onClose(): void {
    this.closeSheet.emit();
  }

  getTransform(): string {
    if (!this.isDragging() || !this.isBrowser) return '';
    const deltaY = this.currentY() - this.startY();
    return `translateY(${deltaY}px)`;
  }
}
