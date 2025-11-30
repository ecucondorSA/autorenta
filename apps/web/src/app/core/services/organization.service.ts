import { Injectable } from '@angular/core';
import { Organization, OrganizationMember } from '../models/organization.model';
import { injectSupabase } from './supabase-client.service';

@Injectable({
  providedIn: 'root',
})
export class OrganizationService {
  private readonly supabase = injectSupabase();

  /**
   * Get organizations where the current user is a member
   */
  async getMyOrganizations(): Promise<Organization[]> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Organization[]) || [];
  }

  /**
   * Get members of a specific organization
   */
  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    const { data, error } = await this.supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) throw error;
    return (data as OrganizationMember[]) || [];
  }

  /**
   * Get bonus progress for cars in an organization
   */
  async getBonusesProgress(organizationId: string): Promise<import('../models/organization.model').BonusProgress[]> {
    const { data, error } = await this.supabase
      .from('fleet_bonuses')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'pending'); // Show only pending/active bonuses

    if (error) throw error;
    return (data as import('../models/organization.model').BonusProgress[]) || [];
  }
}
