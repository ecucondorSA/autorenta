import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';

@Injectable({
  providedIn: 'root',
})
export class DisputeEvidenceService {
  private supabase = inject(SupabaseClientService).getClient();

  // Simple typed view of evidence rows we use in UI
  async getEvidence(disputeId: string): Promise<EvidenceItem[]> {
    type EvidenceRow = {
      id: string | number;
      dispute_id: string;
      path: string;
      note?: string | null;
      created_at?: string | null;
    };

    const { data, error } = await this.supabase
      .from('dispute_evidence')
      .select('id, dispute_id, path, note, created_at')
      .eq('dispute_id', disputeId);
    if (error) throw error;
    return (data ?? []).map((row) => {
      const safe = row as EvidenceRow;
      return {
        id: String(safe.id),
        dispute_id: safe.dispute_id,
        path: safe.path,
        note: safe.note ?? null,
        created_at: safe.created_at ?? null,
      };
    });
  }

  async uploadEvidence(disputeId: string, file: File, note?: string): Promise<string> {
    const filePath = `disputes/${disputeId}/${Date.now()}_${file.name}`;

    // 1. Subir archivo al Storage
    const { error: uploadError } = await this.supabase.storage
      .from('evidence') // Asumiendo bucket 'evidence'
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2. Registrar en BD
    const { error: dbError } = await this.supabase.from('dispute_evidence').insert({
      dispute_id: disputeId,
      path: filePath,
      note: note,
    });

    if (dbError) throw dbError;

    return filePath;
  }
}
export interface EvidenceItem {
  id: string;
  dispute_id: string;
  path: string;
  note?: string | null;
  created_at?: string | null;
}
