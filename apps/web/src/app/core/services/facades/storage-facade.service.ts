import { Injectable } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import type { FileOptions } from '@supabase/storage-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class StorageFacadeService {
  private readonly supabase = injectSupabase();

  async upload(
    bucket: string,
    path: string,
    file: File | Blob,
    options?: FileOptions,
  ): Promise<void> {
    const { error } = await this.supabase.storage.from(bucket).upload(path, file, options);

    if (error) {
      throw error;
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    const {
      data: { publicUrl },
    } = this.supabase.storage.from(bucket).getPublicUrl(path);

    return publicUrl;
  }

  async removeChannel(channel: RealtimeChannel): Promise<void> {
    await this.supabase.removeChannel(channel);
  }
}
