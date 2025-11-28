import { APIRequestContext } from '@playwright/test';

export class ApiHelper {
  private request: APIRequestContext;
  private baseURL: string;

  constructor(request: APIRequestContext, baseURL: string) {
    this.request = request;
    this.baseURL = baseURL;
  }

  /**
   * Realiza login via API (Supabase o endpoint custom)
   * NOTA: Como fallback por ahora usaremos UI en global-setup si la API es compleja de deducir sin docs,
   * pero dejamos la estructura lista.
   */
  async login(email: string, password: string): Promise<any> {
    // TODO: Implementar login real contra Supabase Auth API
    // Por ahora retornamos mock o implementamos si descubrimos el endpoint exacto
    // Supabase suele ser: POST /auth/v1/token?grant_type=password
    console.log(`[ApiHelper] Intentando login API para ${email}`);
    return null;
  }

  /**
   * Helper para limpiar el carrito (ejemplo)
   */
  async clearCart(userId: string) {
    // Implementar limpieza de estado
  }

  /**
   * Helper para crear una reserva via API
   */
  async createBooking(carId: string, startDate: string, endDate: string) {
    // Implementar creación de reserva
  }
}
