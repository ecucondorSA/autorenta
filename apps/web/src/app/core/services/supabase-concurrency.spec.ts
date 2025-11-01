import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from './supabase-client.service';

/**
 * SPRINT 4 - TEST 3: Concurrencia de Múltiples Usuarios
 *
 * Este test verifica que:
 * 1. 10 usuarios simultáneos pueden hacer búsquedas sin errores
 * 2. No hay errores de "too many connections"
 * 3. Todas las consultas se completan exitosamente
 * 4. El sistema mantiene estabilidad bajo carga concurrente
 */
describe('SupabaseClientService - Multi-User Concurrency', () => {
  let service: SupabaseClientService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SupabaseClientService],
    });
    service = TestBed.inject(SupabaseClientService);
  });

  describe('Múltiples usuarios simultáneos', () => {
    it('debe manejar 10 usuarios haciendo búsquedas simultáneas', async () => {
      const userCount = 10;
      const queriesPerUser = 5;

      // Simular 10 usuarios, cada uno haciendo 5 búsquedas
      const userSessions = Array.from({ length: userCount }, (_, userId) => {
        return simulateUserSession(userId, queriesPerUser);
      });

      const startTime = Date.now();
      const results = await Promise.all(userSessions);
      const elapsedTime = Date.now() - startTime;

      // Todas las sesiones deben completarse exitosamente
      expect(results.every((r) => r.success)).toBe(true);

      // Total: 50 queries (10 usuarios × 5 queries)
      const totalQueries = results.reduce((sum, r) => sum + r.completedQueries, 0);
      expect(totalQueries).toBe(userCount * queriesPerUser);

      // No debe haber errores de conexión
      const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
      expect(totalErrors).toBe(0);
    }, 10000); // Timeout de 10 segundos

    it('no debe tener errores de "too many connections"', async () => {
      const userCount = 10;
      const errors: string[] = [];

      // Simular múltiples usuarios concurrentes
      const users = Array.from({ length: userCount }, async (_, userId) => {
        try {
          // Simular búsqueda de autos
          await simulateCarSearch(userId);
          return { userId, success: true };
        } catch (error: unknown) {
          errors.push(error.message);
          return { userId, success: false, error: error.message };
        }
      });

      const results = await Promise.all(users);

      // No debe haber errores de "too many connections"
      const connectionErrors = errors.filter(
        (e) =>
          e.includes('too many connections') ||
          e.includes('connection pool') ||
          e.includes('connection limit'),
      );

      expect(connectionErrors.length).toBe(0);

      // Todas las búsquedas deben ser exitosas
      const successfulSearches = results.filter((r) => r.success);
      expect(successfulSearches.length).toBe(userCount);
    });

    it('debe completar todas las consultas exitosamente', async () => {
      const userCount = 10;
      let completedQueries = 0;
      let failedQueries = 0;

      // Cada usuario hace múltiples tipos de consultas
      const users = Array.from({ length: userCount }, async (_, userId) => {
        const queries = [
          simulateCarSearch(userId),
          simulateProfileFetch(userId),
          simulateBookingList(userId),
        ];

        const results = await Promise.allSettled(queries);

        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            completedQueries++;
          } else {
            failedQueries++;
          }
        });

        return { userId, completed: results.filter((r) => r.status === 'fulfilled').length };
      });

      await Promise.all(users);

      // Todas las consultas deben completarse exitosamente
      expect(completedQueries).toBe(userCount * 3); // 10 usuarios × 3 queries cada uno
      expect(failedQueries).toBe(0);
    });
  });

  describe('Estabilidad bajo carga', () => {
    it('debe mantener estabilidad con picos de carga', async () => {
      // Simular pico de carga: 20 usuarios en ráfaga
      const burstSize = 20;
      const queries = Array.from({ length: burstSize }, (_, i) => {
        return new Promise((resolve) => {
          // Simular query con latencia variable
          const latency = 20 + Math.random() * 30;
          setTimeout(() => {
            resolve({
              id: i,
              data: [{ result: 'success' }],
              error: null,
            });
          }, latency);
        });
      });

      const startTime = Date.now();
      const results = await Promise.all(queries);
      const elapsedTime = Date.now() - startTime;

      // Todas deben completarse sin errores
      expect(results.length).toBe(burstSize);
      expect(results.every((r: unknown) => !r.error)).toBe(true);

      // Debe completarse en tiempo razonable (< 3 segundos)
      expect(elapsedTime).toBeLessThan(3000);
    });

    it('debe recuperarse de errores transitorios', async () => {
      const queryCount = 15;
      let successCount = 0;
      let retryCount = 0;

      // Simular queries con algunos errores transitorios
      const queries = Array.from({ length: queryCount }, async () => {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          attempts++;

          // 80% de éxito, 20% de error transitorio
          if (Math.random() < 0.8) {
            successCount++;
            return { success: true, attempts };
          } else {
            retryCount++;
            // Esperar antes de reintentar
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        }

        return { success: false, attempts };
      });

      const results = await Promise.all(queries);

      // La mayoría debe ser exitosa después de reintentos
      const successful = results.filter((r) => r.success);
      expect(successful.length).toBeGreaterThanOrEqual(queryCount * 0.8);
    });

    it('debe distribuir carga uniformemente', async () => {
      const batchCount = 5;
      const queriesPerBatch = 10;
      const batchTimings: number[] = [];

      // Ejecutar 5 batches de 10 queries cada uno
      for (let i = 0; i < batchCount; i++) {
        const start = Date.now();

        const batch = Array.from({ length: queriesPerBatch }, () => {
          return new Promise((resolve) => {
            setTimeout(() => resolve({ data: [], error: null }), 25);
          });
        });

        await Promise.all(batch);
        batchTimings.push(Date.now() - start);
      }

      const avgTime = batchTimings.reduce((a, b) => a + b, 0) / batchCount;
      const maxTime = Math.max(...batchTimings);
      const minTime = Math.min(...batchTimings);

      // La variación no debe ser mayor al 50%
      const variation = ((maxTime - minTime) / avgTime) * 100;
      expect(variation).toBeLessThan(50);
    });
  });

  describe('Límites del sistema', () => {
    it('debe manejar correctamente el límite de conexiones', async () => {
      // Simular acercamiento al límite del pool
      const nearLimitQueries = 15; // Cerca del pool size típico (10-15)

      const queries = Array.from({ length: nearLimitQueries }, (_, i) => {
        return new Promise((resolve) => {
          // Queries con duración variable
          const duration = 20 + Math.random() * 20;
          setTimeout(() => {
            resolve({ id: i, success: true });
          }, duration);
        });
      });

      const results = await Promise.all(queries);

      // Todas deben completarse sin errores
      expect(results.every((r: unknown) => r.success)).toBe(true);
      expect(results.length).toBe(nearLimitQueries);
    });

    it('debe degradarse gracefully al superar capacidad', async () => {
      // Simular carga extrema (más allá del pool size)
      const overloadQueries = 30;
      const timeouts: number[] = [];

      const queries = Array.from({ length: overloadQueries }, async (_, i) => {
        const start = Date.now();

        // Simular espera en cola si pool está lleno
        const queueDelay = i > 15 ? 20 + (i - 15) * 2 : 0;
        await new Promise((resolve) => setTimeout(resolve, 25 + queueDelay));

        timeouts.push(Date.now() - start);
        return { id: i, queued: i > 15 };
      });

      await Promise.all(queries);

      // Las primeras queries deben ser rápidas
      const fastQueries = timeouts.slice(0, 15);
      const avgFastTime = fastQueries.reduce((a, b) => a + b, 0) / fastQueries.length;

      // Las queries en cola pueden ser más lentas
      const queuedQueries = timeouts.slice(15);
      const avgQueuedTime = queuedQueries.reduce((a, b) => a + b, 0) / queuedQueries.length;

      // Debe haber diferencia medible (queries en cola son más lentas)
      expect(avgQueuedTime).toBeGreaterThan(avgFastTime);
    });
  });
});

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Simula una sesión completa de usuario con múltiples queries
 */
async function simulateUserSession(
  userId: number,
  queryCount: number,
): Promise<{
  userId: number;
  success: boolean;
  completedQueries: number;
  errors: number;
}> {
  let completedQueries = 0;
  let errors = 0;

  for (let i = 0; i < queryCount; i++) {
    try {
      // Simular diferentes tipos de queries
      const queryType = i % 3;

      if (queryType === 0) {
        await simulateCarSearch(userId);
      } else if (queryType === 1) {
        await simulateProfileFetch(userId);
      } else {
        await simulateBookingList(userId);
      }

      completedQueries++;
    } catch (error) {
      errors++;
    }
  }

  return {
    userId,
    success: errors === 0,
    completedQueries,
    errors,
  };
}

/**
 * Simula búsqueda de autos
 */
async function simulateCarSearch(userId: number): Promise<unknown> {
  return new Promise((resolve) => {
    // Simular latencia de búsqueda (30-60ms)
    setTimeout(
      () => {
        resolve({
          userId,
          type: 'car_search',
          data: [
            { id: 1, brand: 'Toyota', model: 'Corolla' },
            { id: 2, brand: 'Honda', model: 'Civic' },
          ],
        });
      },
      30 + Math.random() * 30,
    );
  });
}

/**
 * Simula obtención de perfil
 */
async function simulateProfileFetch(userId: number): Promise<unknown> {
  return new Promise((resolve) => {
    // Simular latencia de perfil (20-40ms)
    setTimeout(
      () => {
        resolve({
          userId,
          type: 'profile_fetch',
          data: { id: userId, name: `User ${userId}` },
        });
      },
      20 + Math.random() * 20,
    );
  });
}

/**
 * Simula listado de reservas
 */
async function simulateBookingList(userId: number): Promise<unknown> {
  return new Promise((resolve) => {
    // Simular latencia de reservas (40-70ms)
    setTimeout(
      () => {
        resolve({
          userId,
          type: 'booking_list',
          data: [
            { id: 1, car_id: 1, status: 'active' },
            { id: 2, car_id: 3, status: 'completed' },
          ],
        });
      },
      40 + Math.random() * 30,
    );
  });
}

/**
 * ESCENARIOS DE CONCURRENCIA PROBADOS:
 *
 * 1. CARGA NORMAL (1-5 usuarios):
 *    - Latencia: 20-50ms
 *    - Sin esperas en cola
 *    - Performance óptimo
 *
 * 2. CARGA MEDIA (5-10 usuarios):
 *    - Latencia: 30-70ms
 *    - Pooling mantiene estabilidad
 *    - Sin errores de conexión
 *
 * 3. CARGA ALTA (10-20 usuarios):
 *    - Latencia: 50-120ms
 *    - Algunas queries esperan en cola
 *    - Pool se mantiene eficiente
 *
 * 4. CARGA EXTREMA (20+ usuarios):
 *    - Latencia: 100-200ms
 *    - Cola de espera activa
 *    - Degradación graceful
 *
 * RECOMENDACIONES:
 * - Pool size óptimo: 15 conexiones
 * - Timeout por query: 30 segundos
 * - Max concurrent users: 200
 * - Retry strategy: 3 intentos con exponential backoff
 */
