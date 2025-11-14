import { inject, Injectable, signal } from '@angular/core';
import type { UserVerificationStatus, VerificationRole, UserDocument } from '../models';
import { SupabaseClientService } from './supabase-client.service';

@Injectable({
  providedIn: 'root',
})
export class VerificationService {
  private readonly supabase = inject(SupabaseClientService).getClient();

  readonly statuses = signal<UserVerificationStatus[]>([]);
  readonly documents = signal<UserDocument[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async loadStatuses(): Promise<UserVerificationStatus[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase
        .from('user_verifications')
        .select('*')
        .order('role');

      if (error) {
        throw error;
      }

      return this.setStatuses((data ?? []) as UserVerificationStatus[]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No pudimos obtener el estado de verificación.';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  async triggerVerification(role?: VerificationRole): Promise<UserVerificationStatus[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.functions.invoke('verify-user-docs', {
        body: role ? { role } : {},
      });

      if (error) {
        throw error;
      }

      const payload = Array.isArray(data) ? (data as UserVerificationStatus[]) : [];
      return this.setStatuses(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos validar tu documentación.';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  clearError(): void {
    this.error.set(null);
  }

  async loadDocuments(): Promise<UserDocument[]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      this.documents.set([]);
      return [];
    }

    const { data, error } = await this.supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const docs = (data ?? []) as UserDocument[];
    this.documents.set(docs);
    return docs;
  }

  private setStatuses(statuses: UserVerificationStatus[]): UserVerificationStatus[] {
    this.statuses.set(statuses);
    return statuses;
  }
}
