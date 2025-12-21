import { LoggerService } from '@core/services/infrastructure/logger.service';
import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { BonusProgress } from '../../../core/models/organization.model';

export interface Organization {
  id: string;
  name: string;
  type: 'fleet' | 'corporate' | 'agency';
  verified: boolean;
  owner_id: string;
  role?: 'owner' | 'admin' | 'manager' | 'driver'; // Rol del usuario actual (join)
}

@Injectable({
  providedIn: 'root',
})
export class OrganizationService {
  private readonly logger = inject(LoggerService);
  private supabase = inject(SupabaseClientService).getClient();

  async getMyOrganizations(): Promise<Organization[]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    // Consultar organizaciones donde soy miembro
    const { data, error } = await this.supabase
      .from('organization_members')
      .select(
        `
        role,
        organization:organizations (
          id,
          name,
          type,
          verified,
          owner_id
        )
      `,
      )
      .eq('user_id', user.id);

    if (error) throw error;

    // Mapear respuesta a estructura plana
    type MembershipRow = {
      role: Organization['role'];
      organization: Organization | Organization[];
    };

    return (data ?? []).map((item) => {
      const row = item as MembershipRow;
      const org = Array.isArray(row.organization) ? row.organization[0] : row.organization;

      return {
        ...org,
        role: row.role,
      } as Organization;
    });
  }

  async createOrganization(
    name: string,
    type: 'fleet' | 'corporate' | 'agency' = 'fleet',
  ): Promise<Organization> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    // 1. Crear Organización
    const { data: org, error: orgError } = await this.supabase
      .from('organizations')
      .insert({
        name,
        type,
        owner_id: user.id,
        verified: false, // Default
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // 2. Añadirme como miembro (Owner)
    const { error: memberError } = await this.supabase.from('organization_members').insert({
      organization_id: org.id,
      user_id: user.id,
      role: 'owner',
    });

    if (memberError) {
      // Rollback manual si falla el miembro (idealmente esto sería una función RPC transaction)
      console.error(
        'Error añadiendo miembro owner, intentando borrar org huérfana...',
        memberError,
      );
      await this.supabase.from('organizations').delete().eq('id', org.id);
      throw memberError;
    }

    return { ...org, role: 'owner' };
  }

  async getBonusesProgress(organizationId: string): Promise<BonusProgress[]> {
    // TODO: Implement actual bonus progress fetching from database
    // For now, return empty array as this feature is not yet implemented
    this.logger.debug('getBonusesProgress called for org:', organizationId);
    return [];
  }
}
