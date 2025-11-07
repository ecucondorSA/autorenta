/**
 * Admin Search Results Page
 * Issue #137 - Global Search Interface for Admin Operations
 *
 * Features:
 * - Tabbed interface for entity types (users, bookings, cars, transactions)
 * - Paginated results (20 per page)
 * - Quick filters
 * - CSV export capability
 * - Comprehensive entity information display
 */

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '@core/services/admin.service';
import type {
  UserSearchResult,
  BookingSearchResult,
  CarSearchResult,
  TransactionSearchResult,
} from '@core/types/admin.types';
import { GlobalSearchBarComponent } from '../components/global-search-bar.component';

type EntityType = 'users' | 'bookings' | 'cars' | 'transactions';

@Component({
  selector: 'autorenta-admin-search-results-page',
  standalone: true,
  imports: [CommonModule, FormsModule, GlobalSearchBarComponent],
  templateUrl: './admin-search-results.page.html',
  styleUrl: './admin-search-results.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSearchResultsPage implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // State signals
  private readonly searchQuerySignal = signal<string>('');
  private readonly activeTabSignal = signal<EntityType>('users');
  private readonly loadingSignal = signal<boolean>(false);
  private readonly currentPageSignal = signal<number>(1);
  private readonly itemsPerPage = 20;

  // Results signals
  private readonly usersSignal = signal<UserSearchResult[]>([]);
  private readonly bookingsSignal = signal<BookingSearchResult[]>([]);
  private readonly carsSignal = signal<CarSearchResult[]>([]);
  private readonly transactionsSignal = signal<TransactionSearchResult[]>([]);

  // Computed values
  readonly searchQuery = computed(() => this.searchQuerySignal());
  readonly activeTab = computed(() => this.activeTabSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly currentPage = computed(() => this.currentPageSignal());

  readonly users = computed(() => this.usersSignal());
  readonly bookings = computed(() => this.bookingsSignal());
  readonly cars = computed(() => this.carsSignal());
  readonly transactions = computed(() => this.transactionsSignal());

  readonly totalResults = computed(() => {
    switch (this.activeTabSignal()) {
      case 'users':
        return this.usersSignal().length;
      case 'bookings':
        return this.bookingsSignal().length;
      case 'cars':
        return this.carsSignal().length;
      case 'transactions':
        return this.transactionsSignal().length;
      default:
        return 0;
    }
  });

  readonly totalPages = computed(() =>
    Math.ceil(this.totalResults() / this.itemsPerPage),
  );

  readonly paginatedResults = computed(() => {
    const start = (this.currentPageSignal() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;

    switch (this.activeTabSignal()) {
      case 'users':
        return this.usersSignal().slice(start, end);
      case 'bookings':
        return this.bookingsSignal().slice(start, end);
      case 'cars':
        return this.carsSignal().slice(start, end);
      case 'transactions':
        return this.transactionsSignal().slice(start, end);
      default:
        return [];
    }
  });

  readonly tabCounts = computed(() => ({
    users: this.usersSignal().length,
    bookings: this.bookingsSignal().length,
    cars: this.carsSignal().length,
    transactions: this.transactionsSignal().length,
  }));

  ngOnInit(): void {
    // Get query and type from URL params
    this.route.queryParams.subscribe((params) => {
      const query = params['q'] || '';
      const type = (params['type'] as EntityType) || 'users';

      this.searchQuerySignal.set(query);
      this.activeTabSignal.set(type);

      if (query) {
        this.performSearch();
      }
    });
  }

  async performSearch(): Promise<void> {
    const query = this.searchQuerySignal();
    if (!query || query.length < 2) return;

    this.loadingSignal.set(true);
    this.currentPageSignal.set(1);

    try {
      // Search all entity types in parallel
      const [users, bookings, cars, transactions] = await Promise.all([
        this.adminService.searchUsers(query, 100, 0),
        this.adminService.searchBookings(query, 100, 0),
        this.adminService.searchCars(query, 100, 0),
        this.adminService.searchTransactions(query, 100, 0),
      ]);

      this.usersSignal.set(users);
      this.bookingsSignal.set(bookings);
      this.carsSignal.set(cars);
      this.transactionsSignal.set(transactions);
    } catch (error) {
      console.error('Error searching:', error);
      alert('Error al realizar la búsqueda: ' + (error as Error).message);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  switchTab(tab: EntityType): void {
    this.activeTabSignal.set(tab);
    this.currentPageSignal.set(1);

    // Update URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: this.searchQuerySignal(), type: tab },
      queryParamsHandling: 'merge',
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPageSignal.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  exportToCSV(): void {
    const tab = this.activeTabSignal();
    let data: unknown[] = [];
    let filename = '';

    switch (tab) {
      case 'users':
        data = this.usersSignal();
        filename = 'users-search';
        break;
      case 'bookings':
        data = this.bookingsSignal();
        filename = 'bookings-search';
        break;
      case 'cars':
        data = this.carsSignal();
        filename = 'cars-search';
        break;
      case 'transactions':
        data = this.transactionsSignal();
        filename = 'transactions-search';
        break;
    }

    if (data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const headers = Object.keys(data[0] as object).join(',');
    const rows = data.map((item) =>
      Object.values(item as object)
        .map((v) => {
          const stringValue = String(v ?? '');
          return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
        })
        .join(','),
    );

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${filename}-${new Date().toISOString().split('T')[0]}.csv`,
    );
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'ARS',
    }).format(amount);
  }

  getStatusClass(status: string): string {
    const statusLower = status?.toLowerCase() || '';
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

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(
      () => {
        // Could add a toast notification here
        console.log('Copiado al portapapeles:', text);
      },
      (err) => {
        console.error('Error al copiar:', err);
      },
    );
  }
}
