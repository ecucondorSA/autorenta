/**
 * Global Search Bar Component
 * Issue #137 - Global Search Interface for Admin Operations
 *
 * Features:
 * - Debounced search input (300ms)
 * - Autocomplete dropdown with grouped results
 * - Max 5 items per entity type
 * - Keyboard navigation support
 * - Click to navigate to detailed search results
 */

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
  effect,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '@core/services/admin.service';
import type { GlobalSearchResults } from '@core/types/admin.types';

@Component({
  selector: 'app-admin-global-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './global-search-bar.component.html',
  styleUrl: './global-search-bar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalSearchBarComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // State signals
  private readonly searchQuerySignal = signal<string>('');
  private readonly searchResultsSignal = signal<GlobalSearchResults>({
    users: [],
    bookings: [],
    cars: [],
    transactions: [],
  });
  private readonly searchingSignal = signal<boolean>(false);
  private readonly showDropdownSignal = signal<boolean>(false);
  private readonly selectedIndexSignal = signal<number>(-1);
  private readonly lastSearchTimeSignal = signal<number>(0);
  private readonly searchCountSignal = signal<number>(0);

  // Debounce timer
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Computed values
  readonly searchQuery = computed(() => this.searchQuerySignal());
  readonly searchResults = computed(() => this.searchResultsSignal());
  readonly searching = computed(() => this.searchingSignal());
  readonly showDropdown = computed(() => this.showDropdownSignal());
  readonly selectedIndex = computed(() => this.selectedIndexSignal());

  readonly totalResults = computed(() => {
    const results = this.searchResultsSignal();
    return (
      results.users.length +
      results.bookings.length +
      results.cars.length +
      results.transactions.length
    );
  });

  readonly hasResults = computed(() => this.totalResults() > 0);

  // Flattened list for keyboard navigation
  readonly flattenedResults = computed(() => {
    const results = this.searchResultsSignal();
    const flattened: Array<{ type: string; data: unknown }> = [];

    if (results.users.length > 0) {
      results.users.forEach((user) => flattened.push({ type: 'user', data: user }));
    }
    if (results.bookings.length > 0) {
      results.bookings.forEach((booking) => flattened.push({ type: 'booking', data: booking }));
    }
    if (results.cars.length > 0) {
      results.cars.forEach((car) => flattened.push({ type: 'car', data: car }));
    }
    if (results.transactions.length > 0) {
      results.transactions.forEach((transaction) =>
        flattened.push({ type: 'transaction', data: transaction }),
      );
    }

    return flattened;
  });

  constructor() {
    // Auto-search effect with debounce
    effect(() => {
      const query = this.searchQuerySignal();
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      if (!query || query.length < 2) {
        this.searchResultsSignal.set({
          users: [],
          bookings: [],
          cars: [],
          transactions: [],
        });
        this.showDropdownSignal.set(false);
        return;
      }

      this.debounceTimer = setTimeout(() => {
        this.performSearch();
      }, 300); // 300ms debounce
    });
  }

  ngOnInit(): void {
    // Close dropdown when clicking outside
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  private handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.global-search-container')) {
      this.showDropdownSignal.set(false);
    }
  }

  updateSearchQuery(query: string): void {
    this.searchQuerySignal.set(query);
    this.selectedIndexSignal.set(-1);
  }

  async performSearch(): Promise<void> {
    const query = this.searchQuerySignal();
    if (!query || query.length < 2) return;

    // Rate limiting: max 10 searches per minute
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    if (this.lastSearchTimeSignal() > oneMinuteAgo && this.searchCountSignal() >= 10) {
      alert('Demasiadas búsquedas. Por favor espera un momento.');
      return;
    }

    // Reset count if more than 1 minute has passed
    if (this.lastSearchTimeSignal() < oneMinuteAgo) {
      this.searchCountSignal.set(0);
    }

    this.searchingSignal.set(true);
    try {
      const results = await this.adminService.globalSearch(query);
      this.searchResultsSignal.set(results);
      this.showDropdownSignal.set(true);
      this.lastSearchTimeSignal.set(now);
      this.searchCountSignal.update((count) => count + 1);
    } catch (error) {
      console.error('Error searching:', error);
      this.searchResultsSignal.set({
        users: [],
        bookings: [],
        cars: [],
        transactions: [],
      });
    } finally {
      this.searchingSignal.set(false);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    const flattened = this.flattenedResults();
    const currentIndex = this.selectedIndexSignal();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < flattened.length - 1) {
          this.selectedIndexSignal.set(currentIndex + 1);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) {
          this.selectedIndexSignal.set(currentIndex - 1);
        }
        break;

      case 'Enter':
        event.preventDefault();
        if (currentIndex >= 0 && currentIndex < flattened.length) {
          const item = flattened[currentIndex];
          this.navigateToItem(item.type, item.data as { id: string });
        } else {
          // Navigate to full search results page
          this.navigateToSearchPage();
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.showDropdownSignal.set(false);
        this.searchInput.nativeElement.blur();
        break;
    }
  }

  navigateToItem(type: string, item: { id: string }): void {
    this.showDropdownSignal.set(false);

    // Navigate to appropriate detail page based on type
    switch (type) {
      case 'user':
        // TODO: Add user detail page when available
        this.router.navigate(['/admin/search'], { queryParams: { q: item.id, type: 'users' } });
        break;
      case 'booking':
        // TODO: Add booking detail page when available
        this.router.navigate(['/admin/search'], { queryParams: { q: item.id, type: 'bookings' } });
        break;
      case 'car':
        // TODO: Add car detail page when available
        this.router.navigate(['/admin/search'], { queryParams: { q: item.id, type: 'cars' } });
        break;
      case 'transaction':
        this.router.navigate(['/admin/search'], {
          queryParams: { q: item.id, type: 'transactions' },
        });
        break;
    }
  }

  navigateToSearchPage(): void {
    const query = this.searchQuerySignal();
    if (query) {
      this.router.navigate(['/admin/search'], { queryParams: { q: query } });
      this.showDropdownSignal.set(false);
    }
  }

  clearSearch(): void {
    this.searchQuerySignal.set('');
    this.searchResultsSignal.set({
      users: [],
      bookings: [],
      cars: [],
      transactions: [],
    });
    this.showDropdownSignal.set(false);
    this.selectedIndexSignal.set(-1);
  }

  getEntityIcon(type: string): string {
    const icons: Record<string, string> = {
      user: '👤',
      booking: '📅',
      car: '🚗',
      transaction: '💰',
    };
    return icons[type] || '📄';
  }

  getEntityLabel(type: string): string {
    const labels: Record<string, string> = {
      user: 'Usuario',
      booking: 'Reserva',
      car: 'Auto',
      transaction: 'Transacción',
    };
    return labels[type] || type;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'ARS',
    }).format(amount);
  }

  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    const classes: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      rejected: 'bg-red-100 text-red-800',
      failed: 'bg-red-100 text-red-800',
      suspended: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-600',
    };
    return classes[statusLower] || 'bg-gray-100 text-gray-800';
  }
}
