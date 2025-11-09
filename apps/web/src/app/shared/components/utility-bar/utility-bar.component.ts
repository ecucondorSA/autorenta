import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  signal,
  inject,
  PLATFORM_ID,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface QuickFilter {
  id: string;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-utility-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './utility-bar.component.html',
  styleUrls: ['./utility-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UtilityBarComponent implements OnInit, OnDestroy {
  @Input() searchValue = '';
  @Input() quickFilters: QuickFilter[] = [];
  @Input() showSearch = true;

  @Output() searchChange = new EventEmitter<string>();
  @Output() searchSubmit = new EventEmitter<string>();
  @Output() quickFilterClick = new EventEmitter<string>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly isVisible = signal(false);
  readonly searchInputValue = signal(this.searchValue);

  private scrollListener?: () => void;

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.setupScrollListener();
  }

  ngOnDestroy(): void {
    if (this.isBrowser && this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
  }

  private setupScrollListener(): void {
    if (!this.isBrowser) return;
    this.scrollListener = () => {
      const scrolled = window.scrollY > 100; // Show after scrolling past header
      this.isVisible.set(scrolled);
    };
    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  onSearchInput(value: string): void {
    this.searchInputValue.set(value);
    this.searchChange.emit(value);
  }

  onSearchSubmit(value: string): void {
    this.searchSubmit.emit(value);
  }

  onQuickFilterClick(filterId: string): void {
    this.quickFilterClick.emit(filterId);
  }
}
