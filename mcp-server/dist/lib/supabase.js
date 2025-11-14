import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
// Cargar variables de entorno
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../../.env') });
export class SupabaseClient {
    client;
    cache = new Map();
    cacheTTL;
    cacheEnabled;
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase credentials in environment variables');
        }
        this.client = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        this.cacheTTL = parseInt(process.env.CACHE_TTL || '300') * 1000;
        this.cacheEnabled = process.env.ENABLE_CACHE === 'true';
    }
    getCacheKey(table, params) {
        return `${table}:${JSON.stringify(params || {})}`;
    }
    getFromCache(key) {
        if (!this.cacheEnabled)
            return null;
        const entry = this.cache.get(key);
        if (entry && Date.now() - entry.timestamp < this.cacheTTL) {
            console.error(`Cache hit: ${key}`);
            return entry.data;
        }
        return null;
    }
    setCache(key, data) {
        if (!this.cacheEnabled)
            return;
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    async getCars(filters) {
        const cacheKey = this.getCacheKey('cars', filters);
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        let query = this.client
            .from('cars')
            .select(`
        *,
        car_photos (id, url, is_cover),
        profiles!cars_owner_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `);
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.owner_id) {
            query = query.eq('owner_id', filters.owner_id);
        }
        if (filters?.limit) {
            query = query.limit(filters.limit);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error)
            throw error;
        this.setCache(cacheKey, data);
        return data;
    }
    async getCarDetails(carId) {
        const cacheKey = this.getCacheKey('car_details', { id: carId });
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        const { data, error } = await this.client
            .from('cars')
            .select(`
        *,
        car_photos (*),
        car_features (*),
        profiles!cars_owner_id_fkey (*),
        reviews (
          id,
          rating,
          comment,
          created_at,
          profiles!reviews_reviewer_id_fkey (
            full_name,
            avatar_url
          )
        )
      `)
            .eq('id', carId)
            .single();
        if (error)
            throw error;
        this.setCache(cacheKey, data);
        return data;
    }
    async getBookings(filters) {
        const cacheKey = this.getCacheKey('bookings', filters);
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        let query = this.client
            .from('bookings')
            .select(`
        *,
        cars (
          id,
          brand,
          model,
          year,
          license_plate,
          car_photos (url, is_cover)
        ),
        renter:profiles!bookings_renter_id_fkey (
          id,
          full_name,
          avatar_url,
          phone
        )
      `);
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.renter_id) {
            query = query.eq('renter_id', filters.renter_id);
        }
        if (filters?.owner_id) {
            query = query.eq('cars.owner_id', filters.owner_id);
        }
        if (filters?.car_id) {
            query = query.eq('car_id', filters.car_id);
        }
        if (filters?.limit) {
            query = query.limit(filters.limit);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error)
            throw error;
        this.setCache(cacheKey, data);
        return data;
    }
    async getUserProfile(userId) {
        const cacheKey = this.getCacheKey('profile', { id: userId });
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        const { data, error } = await this.client
            .from('profiles')
            .select(`
        *,
        wallet_transactions (
          type,
          amount,
          status,
          created_at
        ),
        cars!cars_owner_id_fkey (
          id,
          brand,
          model,
          status
        ),
        bookings!bookings_renter_id_fkey (
          id,
          status,
          total_amount,
          created_at
        )
      `)
            .eq('id', userId)
            .single();
        if (error)
            throw error;
        this.setCache(cacheKey, data);
        return data;
    }
    async getWalletBalance(userId) {
        const { data, error } = await this.client
            .from('profiles')
            .select('wallet_balance, wallet_locked_balance')
            .eq('id', userId)
            .single();
        if (error)
            throw error;
        return data;
    }
    async getStatistics() {
        const cacheKey = this.getCacheKey('statistics');
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        const [carsResult, bookingsResult, usersResult, revenueResult] = await Promise.all([
            this.client.from('cars').select('status', { count: 'exact', head: false }),
            this.client.from('bookings').select('status', { count: 'exact', head: false }),
            this.client.from('profiles').select('role', { count: 'exact', head: false }),
            this.client.from('wallet_transactions')
                .select('amount')
                .eq('type', 'payment_received')
                .eq('status', 'completed')
        ]);
        const stats = {
            cars: {
                total: carsResult.count || 0,
                active: carsResult.data?.filter(c => c.status === 'active').length || 0,
                pending: carsResult.data?.filter(c => c.status === 'pending').length || 0
            },
            bookings: {
                total: bookingsResult.count || 0,
                active: bookingsResult.data?.filter(b => b.status === 'active').length || 0,
                completed: bookingsResult.data?.filter(b => b.status === 'completed').length || 0
            },
            users: {
                total: usersResult.count || 0,
                owners: usersResult.data?.filter(u => u.role === 'locador' || u.role === 'ambos').length || 0,
                renters: usersResult.data?.filter(u => u.role === 'locatario' || u.role === 'ambos').length || 0
            },
            revenue: {
                total: revenueResult.data?.reduce((sum, t) => sum + t.amount, 0) || 0
            }
        };
        this.setCache(cacheKey, stats);
        return stats;
    }
    // Métodos de escritura (sin caché)
    async updateBookingStatus(bookingId, status) {
        const { data, error } = await this.client
            .from('bookings')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', bookingId)
            .select()
            .single();
        if (error)
            throw error;
        // Limpiar caché relacionado
        this.clearCache('bookings');
        return data;
    }
    async createCarAvailabilityBlock(carId, startDate, endDate, reason) {
        const { data, error } = await this.client
            .from('car_availability')
            .insert({
            car_id: carId,
            start_date: startDate,
            end_date: endDate,
            is_available: false,
            reason
        })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    clearCache(prefix) {
        if (!prefix) {
            this.cache.clear();
            return;
        }
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }
    getClient() {
        return this.client;
    }
}
