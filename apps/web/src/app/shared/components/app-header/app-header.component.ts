import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { injectSupabase } from '../../../core/services/supabase-client.service';

@Component({
  selector: 'app-app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeaderComponent implements OnInit, OnDestroy {
  @Input() compact = false; // When true, shows compact search
  @Input() showSearch = true;
  @Input() searchValue = '';
  @Output() searchChange = new EventEmitter<string>();
  @Output() searchSubmit = new EventEmitter<string>();

  private readonly router = inject(Router);
  private readonly supabase = injectSupabase();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly isScrolled = signal(false);
  readonly isAuthenticated = signal(false);

  readonly searchInputValue = signal(this.searchValue);

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.checkAuth();
    this.setupScrollListener();
  }

  ngOnDestroy(): void {
    if (this.isBrowser && this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
  }

  private scrollListener?: () => void;

  private setupScrollListener(): void {
    if (!this.isBrowser) return;
    this.scrollListener = () => {
      const scrolled = window.scrollY > 50;
      this.isScrolled.set(scrolled);
    };
    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  private async checkAuth(): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    this.isAuthenticated.set(!!user);
  }

  onSearchInput(value: string): void {
    this.searchInputValue.set(value);
    this.searchChange.emit(value);
  }

  onSearchSubmit(value: string): void {
    this.searchSubmit.emit(value);
    // Navigate to search results
    if (value.trim()) {
      this.router.navigate(['/marketplace'], {
        queryParams: { q: value.trim() },
      });
    }
  }

  navigateToPublish(): void {
    this.router.navigate(['/cars/publish']);
  }

  navigateToHowItWorks(): void {
    this.router.navigate(['/how-it-works']);
  }
}
