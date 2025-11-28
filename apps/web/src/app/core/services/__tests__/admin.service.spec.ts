/**
 * AdminService Unit Tests
 * Created: 2025-11-07
 * Issue: #123 - Admin Authentication & Role-Based Access Control
 */

import { TestBed } from '@angular/core/testing';
import { SupabaseClient } from '@supabase/supabase-js';
import { AdminService } from '../admin.service';
import { LoggerService } from '../logger.service';
import type { AdminRole } from '../../types/admin.types';

// TODO: Fix - Service API changed, mocks not matching
describe('AdminService', () => {
  let service: AdminService;
  let mockSupabase: jasmine.SpyObj<SupabaseClient>;
  let mockLogger: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = jasmine.createSpyObj('SupabaseClient', ['auth', 'from', 'rpc']);
    mockLogger = jasmine.createSpyObj('LoggerService', ['error', 'warn', 'info']);

    // Setup default auth mock
    const mockAuth = jasmine.createSpyObj('Auth', ['getUser']);
    mockAuth.getUser.and.returnValue(
      Promise.resolve({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    );
    (mockSupabase as any).auth = mockAuth;

    TestBed.configureTestingModule({
      providers: [AdminService, { provide: LoggerService, useValue: mockLogger }],
    });

    service = TestBed.inject(AdminService);
    // Inject mock supabase (accessing private property for testing)
    (service as any).supabase = mockSupabase;

    // Setup rpc mock to return a thenable object (mimics PostgrestFilterBuilder)
    (mockSupabase.rpc as jasmine.Spy).and.returnValue(
      Promise.resolve({ data: true, error: null }) as any,
    );
  });

  describe('isAdmin', () => {
    it('should return true when user is admin', async () => {
      // Test uses default mock setup (returns true)

      const result = await service.isAdmin();

      expect(result).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('is_admin', {
        check_user_id: 'test-user-id',
      });
    });

    it('should return false when user is not admin', async () => {
      mockSupabase.rpc.and.returnValue(Promise.resolve({ data: false, error: null }) as any);

      const result = await service.isAdmin();

      expect(result).toBe(false);
    });

    it('should return false when user is not authenticated', async () => {
      ((mockSupabase as any).auth.getUser as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: { user: null }, error: null }),
      );

      const result = await service.isAdmin();

      expect(result).toBe(false);
    });

    it('should handle RPC errors gracefully', async () => {
      mockSupabase.rpc.and.returnValue(
        Promise.resolve({ data: null, error: { message: 'Database error' } }) as any,
      );

      const result = await service.isAdmin();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('hasRole', () => {
    beforeEach(() => {
      // Mock getAdminRoles
      mockSupabase.rpc.and.returnValue(
        Promise.resolve({
          data: ['super_admin', 'operations'] as AdminRole[],
          error: null,
        }) as any,
      );
    });

    it('should return true when user has the role', async () => {
      const result = await service.hasRole('super_admin');
      expect(result).toBe(true);
    });

    it('should return false when user does not have the role', async () => {
      const result = await service.hasRole('finance');
      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockSupabase.rpc.and.returnValue(
        Promise.resolve({ data: null, error: { message: 'Database error' } }) as any,
      );

      const result = await service.hasRole('super_admin');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('hasPermission', () => {
    beforeEach(() => {
      // Mock getAdminRoles to return 'support' role
      mockSupabase.rpc.and.returnValue(
        Promise.resolve({
          data: ['support'] as AdminRole[],
          error: null,
        }) as any,
      );
    });

    it('should return true for permissions granted to support role', async () => {
      const result = await service.hasPermission('view_users');
      expect(result).toBe(true);
    });

    it('should return false for permissions not granted to support role', async () => {
      const result = await service.hasPermission('approve_verifications');
      expect(result).toBe(false);
    });

    it('should check all user roles for permission', async () => {
      // Mock user with multiple roles
      mockSupabase.rpc.and.returnValue(
        Promise.resolve({
          data: ['support', 'finance'] as AdminRole[],
          error: null,
        }) as any,
      );

      // Should have permission from finance role
      const result = await service.hasPermission('process_refunds');
      expect(result).toBe(true);
    });
  });

  describe('getAdminRoles', () => {
    it('should return admin roles from RPC', async () => {
      const mockRoles: AdminRole[] = ['super_admin', 'operations'];
      mockSupabase.rpc.and.returnValue(Promise.resolve({ data: mockRoles, error: null }) as any);

      const result = await service.getAdminRoles();

      expect(result).toEqual(mockRoles);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_admin_roles', {
        check_user_id: 'test-user-id',
      });
    });

    it('should cache roles for same user', async () => {
      const mockRoles: AdminRole[] = ['super_admin'];
      mockSupabase.rpc.and.returnValue(Promise.resolve({ data: mockRoles, error: null }) as any);

      // First call
      await service.getAdminRoles();

      // Second call (should use cache)
      await service.getAdminRoles();

      // RPC should only be called once
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    });

    it('should clear cache and refetch for different user', async () => {
      const mockRoles: AdminRole[] = ['super_admin'];
      mockSupabase.rpc.and.returnValue(Promise.resolve({ data: mockRoles, error: null }) as any);

      // First call with user 1
      await service.getAdminRoles();

      // Change user
      ((mockSupabase as any).auth.getUser as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: { user: { id: 'different-user-id' } }, error: null }),
      );

      // Second call with user 2
      await service.getAdminRoles();

      // RPC should be called twice
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when user is not authenticated', async () => {
      ((mockSupabase as any).auth.getUser as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: { user: null }, error: null }),
      );

      const result = await service.getAdminRoles();

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockSupabase.rpc.and.returnValue(
        Promise.resolve({ data: null, error: { message: 'Database error' } }) as any,
      );

      const result = await service.getAdminRoles();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear roles cache', async () => {
      const mockRoles: AdminRole[] = ['super_admin'];
      mockSupabase.rpc.and.returnValue(Promise.resolve({ data: mockRoles, error: null }) as any);

      // Populate cache
      await service.getAdminRoles();
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);

      // Clear cache
      service.clearCache();

      // Next call should hit RPC again
      await service.getAdminRoles();
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
    });
  });

  describe('logAction', () => {
    it('should log admin action successfully', async () => {
      const mockLogId = 'log-entry-id';
      mockSupabase.rpc.and.returnValue(Promise.resolve({ data: mockLogId, error: null }) as any);

      const result = await service.logAction({
        action: 'approve_verification',
        resourceType: 'user_verification',
        resourceId: 'verification-123',
        details: { notes: 'Test approval' },
      });

      expect(result).toBe(mockLogId);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_admin_action', {
        p_action: 'approve_verification',
        p_resource_type: 'user_verification',
        p_resource_id: 'verification-123',
        p_details: { notes: 'Test approval' },
        p_ip_address: null,
        p_user_agent: null,
      });
    });

    it('should include IP and user agent if provided', async () => {
      mockSupabase.rpc.and.returnValue(Promise.resolve({ data: 'log-id', error: null }) as any);

      await service.logAction({
        action: 'test_action',
        resourceType: 'test',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'log_admin_action',
        jasmine.objectContaining({
          p_ip_address: '192.168.1.1',
          p_user_agent: 'Mozilla/5.0',
        }),
      );
    });

    it('should return null when user is not authenticated', async () => {
      ((mockSupabase as any).auth.getUser as jasmine.Spy).and.returnValue(
        Promise.resolve({ data: { user: null }, error: null }),
      );

      const result = await service.logAction({
        action: 'test',
        resourceType: 'test',
      });

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle RPC errors gracefully', async () => {
      mockSupabase.rpc.and.returnValue(
        Promise.resolve({ data: null, error: { message: 'Database error' } }) as any,
      );

      const result = await service.logAction({
        action: 'test',
        resourceType: 'test',
      });

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('grantAdminRole', () => {
    beforeEach(() => {
      // Mock hasPermission to return true for grant_admin_roles
      spyOn(service, 'hasPermission').and.returnValue(Promise.resolve(true));

      // Mock from().insert()
      const mockInsert = jasmine.createSpy('insert').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          single: jasmine.createSpy('single').and.returnValue(
            Promise.resolve({
              data: {
                id: 'admin-user-id',
                user_id: 'target-user-id',
                role: 'operations',
              },
              error: null,
            }),
          ),
        }),
      });

      const mockFrom = jasmine.createSpy('from').and.returnValue({
        insert: mockInsert,
      });

      (mockSupabase as any).from = mockFrom;

      // Mock logAction
      spyOn(service, 'logAction').and.returnValue(Promise.resolve('log-id'));
    });

    it('should grant admin role successfully', async () => {
      const result = await service.grantAdminRole(
        'target-user-id',
        'operations',
        'Promotion notes',
      );

      expect(result).toBeDefined();
      expect(result?.role).toBe('operations');
      expect(service.logAction).toHaveBeenCalled();
    });

    it('should throw error when user lacks permission', async () => {
      (service.hasPermission as jasmine.Spy).and.returnValue(Promise.resolve(false));

      await expectAsync(service.grantAdminRole('user-id', 'operations')).toBeRejectedWithError(
        'Insufficient permissions to grant admin roles',
      );
    });
  });

  describe('approveCar', () => {
    beforeEach(() => {
      // Mock hasPermission
      spyOn(service, 'hasPermission').and.returnValue(Promise.resolve(true));

      // Mock from().update()
      const mockEq = jasmine
        .createSpy('eq')
        .and.returnValue(Promise.resolve({ data: null, error: null }));

      const mockUpdate = jasmine.createSpy('update').and.returnValue({ eq: mockEq });

      const mockFrom = jasmine.createSpy('from').and.returnValue({ update: mockUpdate });

      (mockSupabase as any).from = mockFrom;

      // Mock logAction
      spyOn(service, 'logAction').and.returnValue(Promise.resolve('log-id'));
    });

    it('should approve car and log action', async () => {
      await service.approveCar('car-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('cars');
      expect(service.logAction).toHaveBeenCalledWith({
        action: 'approve_car',
        resourceType: 'car',
        resourceId: 'car-123',
      });
    });

    it('should throw error when user lacks permission', async () => {
      (service.hasPermission as jasmine.Spy).and.returnValue(Promise.resolve(false));

      await expectAsync(service.approveCar('car-123')).toBeRejectedWithError(
        'Insufficient permissions to approve cars',
      );
    });
  });
});
