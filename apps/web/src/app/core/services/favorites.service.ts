import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { injectSupabase } from './supabase-client.service';
import { AuthService } from './auth.service';
import { NotificationManagerService } from './notification-manager.service';

export interface FavoriteCar {
  id: string;
  user_id: string;
  car_id: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private readonly supabase = injectSupabase();
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationManagerService);

  favorites = signal<Set<string>>(new Set());
  isLoading = signal(false);

  async loadFavorites() {
    const user = await this.auth.getCurrentUser();
    if (!user) {
      this.favorites.set(this.getLocalFavorites());
      return;
    }

    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('user_favorite_cars')
        .select('car_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const favoriteIds = new Set(data?.map(f => f.car_id) || []);
      this.favorites.set(favoriteIds);

      // Sync with localStorage
      this.saveLocalFavorites(favoriteIds);
    } catch (error) {
      console.error('Error loading favorites:', error);
      this.favorites.set(this.getLocalFavorites());
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggleFavorite(carId: string): Promise<boolean> {
    const user = await this.auth.getCurrentUser();
    const currentFavorites = this.favorites();
    const isFavorite = currentFavorites.has(carId);

    // Optimistic update
    const newFavorites = new Set(currentFavorites);
    if (isFavorite) {
      newFavorites.delete(carId);
    } else {
      newFavorites.add(carId);
    }
    this.favorites.set(newFavorites);
    this.saveLocalFavorites(newFavorites);

    // If not logged in, just save locally
    if (!user) {
      this.notifications.info(
        'Favoritos',
        isFavorite ? 'Eliminado de favoritos' : 'Agregado a favoritos'
      );
      return !isFavorite;
    }

    // Save to database
    try {
      if (isFavorite) {
        const { error } = await this.supabase
          .from('user_favorite_cars')
          .delete()
          .eq('user_id', user.id)
          .eq('car_id', carId);

        if (error) throw error;

        this.notifications.info('Favoritos', 'Eliminado de favoritos');
        return false;
      } else {
        const { error } = await this.supabase
          .from('user_favorite_cars')
          .insert({ user_id: user.id, car_id: carId });

        if (error) throw error;

        this.notifications.success('Favoritos', 'Agregado a favoritos ❤️');
        return true;
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);

      // Revert optimistic update
      this.favorites.set(currentFavorites);
      this.saveLocalFavorites(currentFavorites);

      this.notifications.error('Error', 'No se pudo actualizar favoritos');
      return isFavorite;
    }
  }

  isFavorite(carId: string): boolean {
    return this.favorites().has(carId);
  }

  getFavoriteCount(): number {
    return this.favorites().size;
  }

  async getFavoriteCars() {
    const user = await this.auth.getCurrentUser();
    if (!user) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('user_favorite_cars')
        .select(`
          car_id,
          cars (
            *,
            profiles:owner_id (
              full_name,
              avatar_url,
              is_superhost
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(f => f.cars) || [];
    } catch (error) {
      console.error('Error fetching favorite cars:', error);
      return [];
    }
  }

  navigateToFavorites() {
    this.router.navigate(['/favorites']);
  }

  // LocalStorage helpers
  private getLocalFavorites(): Set<string> {
    try {
      const stored = localStorage.getItem('favorite_cars');
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error reading local favorites:', error);
    }
    return new Set();
  }

  private saveLocalFavorites(favorites: Set<string>) {
    try {
      localStorage.setItem('favorite_cars', JSON.stringify([...favorites]));
    } catch (error) {
      console.error('Error saving local favorites:', error);
    }
  }

  // Sync local favorites to DB after login
  async syncFavoritesAfterLogin() {
    const user = await this.auth.getCurrentUser();
    if (!user) return;

    const localFavorites = this.getLocalFavorites();
    if (localFavorites.size === 0) return;

    try {
      // Insert all local favorites to DB
      const insertData = [...localFavorites].map(car_id => ({
        user_id: user.id,
        car_id
      }));

      const { error } = await this.supabase
        .from('user_favorite_cars')
        .upsert(insertData, { onConflict: 'user_id,car_id' });

      if (error) throw error;

      // Reload from DB
      await this.loadFavorites();
    } catch (error) {
      console.error('Error syncing favorites after login:', error);
    }
  }
}
