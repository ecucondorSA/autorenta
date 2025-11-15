import { TestBed } from '@angular/core/testing';
import { Router, Route, UrlTree } from '@angular/router';
import { AdminGuard, SuperAdminGuard, OperationsGuard, createAdminGuard } from './admin.guard';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../services/logger.service';
import type { AdminRole, AdminPermission } from '../types/admin.types';

describe('AdminGuard', () => {
  let adminService: jasmine.SpyObj<AdminService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let loggerService: jasmine.SpyObj<LoggerService>;

  const mockSession = {
    access_token: 'mock-token',
    user: { id: 'user-123', email: 'admin@example.com' },
  };

  beforeEach(() => {
    const adminServiceSpy = jasmine.createSpyObj('AdminService', [
      'isAdmin',
      'hasRole',
      'hasPermission',
    ]);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['ensureSession']);
    const routerSpy = jasmine.createSpyObj('Router', ['createUrlTree']);
    const loggerServiceSpy = jasmine.createSpyObj('LoggerService', ['info', 'warn', 'error']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AdminService, useValue: adminServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: LoggerService, useValue: loggerServiceSpy },
      ],
    });

    adminService = TestBed.inject(AdminService) as jasmine.SpyObj<AdminService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    loggerService = TestBed.inject(LoggerService) as jasmine.SpyObj<LoggerService>;
  });

  // ============================================================================
  // AUTHENTICATION TESTS
  // ============================================================================

  describe('Authentication', () => {
    it('should allow authenticated admin to access admin routes', async () => {
      // Arrange
      const route: Route = { path: 'admin' };
      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      adminService.isAdmin.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => AdminGuard(route, []));

      // Assert
      expect(result).toBe(true);
      expect(authService.ensureSession).toHaveBeenCalled();
      expect(adminService.isAdmin).toHaveBeenCalled();
      expect(loggerService.info).toHaveBeenCalledWith(
        jasmine.stringContaining('granted access'),
        'AdminGuard',
      );
    });

    it('should redirect unauthenticated users to login', async () => {
      // Arrange
      const route: Route = { path: 'admin' };
      const loginUrlTree = { toString: () => '/auth/login?returnUrl=admin' } as any;

      authService.ensureSession.and.returnValue(Promise.resolve(null));
      router.createUrlTree.and.returnValue(loginUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => AdminGuard(route, []));

      // Assert
      expect(result).toBe(loginUrlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(
        ['/auth/login'],
        { queryParams: { returnUrl: 'admin' } },
      );
      expect(loggerService.warn).toHaveBeenCalledWith(
        jasmine.stringContaining('not authenticated'),
        'AdminGuard',
      );
    });

    it('should redirect authenticated non-admin users to home', async () => {
      // Arrange
      const route: Route = { path: 'admin' };
      const homeUrlTree = { toString: () => '/' } as any;

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      adminService.isAdmin.and.returnValue(Promise.resolve(false));
      router.createUrlTree.and.returnValue(homeUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => AdminGuard(route, []));

      // Assert
      expect(result).toBe(homeUrlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
      expect(loggerService.warn).toHaveBeenCalledWith(
        jasmine.stringContaining('without admin role'),
        'AdminGuard',
      );
    });
  });

  // ============================================================================
  // ROLE-BASED ACCESS CONTROL TESTS
  // ============================================================================

  describe('Role-Based Access Control', () => {
    it('should allow access when user has required role', async () => {
      // Arrange
      const route: Route = {
        path: 'admin/audit-log',
        data: { requiredRole: 'super_admin' as AdminRole },
      };

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      adminService.isAdmin.and.returnValue(Promise.resolve(true));
      adminService.hasRole.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => AdminGuard(route, []));

      // Assert
      expect(result).toBe(true);
      expect(adminService.hasRole).toHaveBeenCalledWith('super_admin');
      expect(loggerService.info).toHaveBeenCalled();
    });

    it('should deny access when user lacks required role', async () => {
      // Arrange
      const route: Route = {
        path: 'admin/audit-log',
        data: { requiredRole: 'super_admin' as AdminRole },
      };
      const adminUrlTree = { toString: () => '/admin?error=insufficient_permissions' } as any;

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      adminService.isAdmin.and.returnValue(Promise.resolve(true));
      adminService.hasRole.and.returnValue(Promise.resolve(false));
      router.createUrlTree.and.returnValue(adminUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => AdminGuard(route, []));

      // Assert
      expect(result).toBe(adminUrlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(
        ['/admin'],
        { queryParams: { error: 'insufficient_permissions' } },
      );
      expect(loggerService.warn).toHaveBeenCalledWith(
        jasmine.stringContaining("requiring role 'super_admin'"),
        'AdminGuard',
      );
    });

    it('should check operations role correctly', async () => {
      // Arrange
      const route: Route = {
        path: 'admin/verifications',
        data: { requiredRole: 'operations' as AdminRole },
      };

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      adminService.isAdmin.and.returnValue(Promise.resolve(true));
      adminService.hasRole.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => AdminGuard(route, []));

      // Assert
      expect(result).toBe(true);
      expect(adminService.hasRole).toHaveBeenCalledWith('operations');
    });

    it('should check finance role correctly', async () => {
      // Arrange
      const route: Route = {
        path: 'admin/payments',
        data: { requiredRole: 'finance' as AdminRole },
      };

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      adminService.isAdmin.and.returnValue(Promise.resolve(true));
      adminService.hasRole.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => AdminGuard(route, []));

      // Assert
      expect(result).toBe(true);
      expect(adminService.hasRole).toHaveBeenCalledWith('finance');
    });
  });

  // ============================================================================
  // PERMISSION-BASED ACCESS CONTROL TESTS
  // ============================================================================

  describe('Permission-Based Access Control', () => {
    it('should allow access when user has required permission', async () => {
      // Arrange
      const route: Route = {
        path: 'admin/verifications',
        data: { requiredPermission: 'approve_verifications' as AdminPermission },
      };

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      adminService.isAdmin.and.returnValue(Promise.resolve(true));
      adminService.hasPermission.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => AdminGuard(route, []));

      // Assert
      expect(result).toBe(true);
      expect(adminService.hasPermission).toHaveBeenCalledWith('approve_verifications');
    });

    it('should deny access when user lacks required permission', async () => {
      // Arrange
      const route: Route = {
        path: 'admin/verifications',
        data: { requiredPermission: 'approve_verifications' as AdminPermission },
      };
      const adminUrlTree = { toString: () => '/admin?error=insufficient_permissions' } as any;

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      adminService.isAdmin.and.returnValue(Promise.resolve(true));
      adminService.hasPermission.and.returnValue(Promise.resolve(false));
      router.createUrlTree.and.returnValue(adminUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => AdminGuard(route, []));

      // Assert
      expect(result).toBe(adminUrlTree);
      expect(loggerService.warn).toHaveBeenCalledWith(
        jasmine.stringContaining("requiring permission 'approve_verifications'"),
        'AdminGuard',
      );
    });
  });

  // ============================================================================
  // COMBINED ROLE AND PERMISSION TESTS
  // ============================================================================

  describe('Combined Role and Permission Requirements', () => {
    it('should check both role and permission when both are specified', async () => {
      // Arrange
      const route: Route = {
        path: 'admin/sensitive',
        data: {
          requiredRole: 'super_admin' as AdminRole,
          requiredPermission: 'view_audit_logs' as AdminPermission,
        },
      };

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      adminService.isAdmin.and.returnValue(Promise.resolve(true));
      adminService.hasRole.and.returnValue(Promise.resolve(true));
      adminService.hasPermission.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => AdminGuard(route, []));

      // Assert
      expect(result).toBe(true);
      expect(adminService.hasRole).toHaveBeenCalledWith('super_admin');
      expect(adminService.hasPermission).toHaveBeenCalledWith('view_audit_logs');
    });

    it('should deny access if role check passes but permission check fails', async () => {
      // Arrange
      const route: Route = {
        path: 'admin/sensitive',
        data: {
          requiredRole: 'operations' as AdminRole,
          requiredPermission: 'approve_verifications' as AdminPermission,
        },
      };
      const adminUrlTree = { toString: () => '/admin?error=insufficient_permissions' } as any;

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      adminService.isAdmin.and.returnValue(Promise.resolve(true));
      adminService.hasRole.and.returnValue(Promise.resolve(true));
      adminService.hasPermission.and.returnValue(Promise.resolve(false));
      router.createUrlTree.and.returnValue(adminUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => AdminGuard(route, []));

      // Assert
      expect(result).toBe(adminUrlTree);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should redirect to home on service error', async () => {
      // Arrange
      const route: Route = { path: 'admin' };
      const homeUrlTree = { toString: () => '/' } as any;

      authService.ensureSession.and.returnValue(Promise.reject(new Error('Auth error')));
      router.createUrlTree.and.returnValue(homeUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => AdminGuard(route, []));

      // Assert
      expect(result).toBe(homeUrlTree);
      expect(loggerService.error).toHaveBeenCalledWith(
        jasmine.stringContaining('Error verifying admin permissions'),
        'AdminGuard',
        jasmine.any(Error),
      );
    });

    it('should handle admin service errors gracefully', async () => {
      // Arrange
      const route: Route = { path: 'admin' };
      const homeUrlTree = { toString: () => '/' } as any;

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      adminService.isAdmin.and.returnValue(Promise.reject(new Error('Admin check failed')));
      router.createUrlTree.and.returnValue(homeUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => AdminGuard(route, []));

      // Assert
      expect(result).toBe(homeUrlTree);
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // GUARD PRESET TESTS
  // ============================================================================

  describe('Guard Presets', () => {
    it('should work with SuperAdminGuard preset', async () => {
      // Arrange
      const route: Route = { path: 'admin/audit' };

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      adminService.isAdmin.and.returnValue(Promise.resolve(true));
      adminService.hasRole.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => SuperAdminGuard(route, []));

      // Assert
      expect(result).toBe(true);
      expect(adminService.hasRole).toHaveBeenCalledWith('super_admin');
    });

    it('should work with OperationsGuard preset', async () => {
      // Arrange
      const route: Route = { path: 'admin/verifications' };

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      adminService.isAdmin.and.returnValue(Promise.resolve(true));
      adminService.hasRole.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => OperationsGuard(route, []));

      // Assert
      expect(result).toBe(true);
      expect(adminService.hasRole).toHaveBeenCalledWith('operations');
    });
  });

  // ============================================================================
  // HELPER FUNCTION TESTS
  // ============================================================================

  describe('createAdminGuard Helper', () => {
    it('should create guard with specific role requirement', async () => {
      // Arrange
      const customGuard = createAdminGuard('finance');
      const route: Route = { path: 'admin/finance' };

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      adminService.isAdmin.and.returnValue(Promise.resolve(true));
      adminService.hasRole.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => customGuard(route, []));

      // Assert
      expect(result).toBe(true);
      expect(adminService.hasRole).toHaveBeenCalledWith('finance');
    });

    it('should create guard with specific permission requirement', async () => {
      // Arrange
      const customGuard = createAdminGuard(undefined, 'view_reports' as AdminPermission);
      const route: Route = { path: 'admin/reports' };

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      adminService.isAdmin.and.returnValue(Promise.resolve(true));
      adminService.hasPermission.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => customGuard(route, []));

      // Assert
      expect(result).toBe(true);
      expect(adminService.hasPermission).toHaveBeenCalledWith('view_reports');
    });

    it('should override route data when using createAdminGuard', async () => {
      // Arrange
      const customGuard = createAdminGuard('super_admin');
      const route: Route = {
        path: 'admin/sensitive',
        data: { requiredRole: 'support' as AdminRole }, // This should be overridden
      };

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      adminService.isAdmin.and.returnValue(Promise.resolve(true));
      adminService.hasRole.and.returnValue(Promise.resolve(true));

      // Act
      await TestBed.runInInjectionContext(() => customGuard(route, []));

      // Assert
      expect(adminService.hasRole).toHaveBeenCalledWith('super_admin'); // Not 'support'
    });
  });
});
