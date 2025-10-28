import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Bucket } from '@supabase/storage-js';
import { SupabaseClientService } from './supabase-client.service';

interface TableExportSummary {
  name: string;
  totalRows: number;
  sampleCount: number;
  fields: Array<{ key: string; type: string; preview: string }>;
  sample: unknown[];
  error?: string;
}

interface StorageExportSummary {
  error?: string;
  buckets: Bucket[];
}

interface ExportPayload {
  generatedAt: string;
  tables: TableExportSummary[];
  storage: StorageExportSummary;
}

@Injectable({
  providedIn: 'root',
})
export class DatabaseExportService {
  private readonly supabase: SupabaseClient;
  private readonly tablesToInspect = [
    'profiles',
    'cars',
    'car_photos',
    'bookings',
    'payments',
    'payment_intents',
  ];

  constructor(private readonly supabaseClient: SupabaseClientService) {
    this.supabase = this.supabaseClient.getClient();
  }

  async exportSnapshot(limit = 3): Promise<{ filename: string; blob: Blob }> {
    const results: TableExportSummary[] = [];

    for (const tableName of this.tablesToInspect) {
      const summary = await this.inspectTable(tableName, limit);
      results.push(summary);
    }

    const storage = await this.inspectStorage();

    const payload: ExportPayload = {
      generatedAt: new Date().toISOString(),
      tables: results,
      storage,
    };

    const filename = `supabase-inspection-${this.buildTimestamp()}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });

    return { filename, blob };
  }

  private async inspectTable(name: string, limit: number): Promise<TableExportSummary> {
    let totalRows = 0;
    let sampleCount = 0;
    let fields: Array<{ key: string; type: string; preview: string }> = [];
    let sample: unknown[] = [];
    let error: string | undefined;

    const { count, error: countError } = await this.supabase
      .from(name)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      error = countError.message;
    } else {
      totalRows = count ?? 0;
    }

    const { data, error: dataError } = await this.supabase.from(name).select('*').limit(limit);

    if (dataError) {
      error = dataError.message;
    } else if (Array.isArray(data)) {
      sample = data;
      sampleCount = data.length;
      if (data.length > 0) {
        const record = data[0] as Record<string, unknown>;
        fields = Object.entries(record).map(([key, value]) => ({
          key,
          type: this.describeValue(value),
          preview: this.previewValue(value),
        }));
      }
    }

    return {
      name,
      totalRows,
      sampleCount,
      fields,
      sample,
      error,
    };
  }

  private async inspectStorage(): Promise<StorageExportSummary> {
    try {
      const { data, error } = await this.supabase.storage.listBuckets();
      if (error) {
        return { error: error.message, buckets: [] };
      }
      return { buckets: data ?? [] };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Error inesperado', buckets: [] };
    }
  }

  private buildTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  private describeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (Array.isArray(value)) {
      return 'array';
    }
    if (value instanceof Date) {
      return 'date';
    }
    return typeof value;
  }

  private previewValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'string') {
      if (value.length <= 60) {
        return value;
      }
      return `${value.slice(0, 60)}...`;
    }
    try {
      const serialized = JSON.stringify(value);
      if (serialized.length <= 60) {
        return serialized;
      }
      return `${serialized.slice(0, 60)}...`;
    } catch {
      return String(value);
    }
  }
}
