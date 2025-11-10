/**
 * AuditLog Decorator - Automatic Admin Action Logging
 * Created: 2025-11-07
 * Issue: #123 - Admin Authentication & Role-Based Access Control
 *
 * Decorator that automatically logs admin actions to the audit trail.
 *
 * Usage:
 * ```typescript
 * class MyAdminService {
 *   constructor(private adminService: AdminService) {}
 *
 *   @AuditLog('approve_user', 'user')
 *   async approveUser(userId: string): Promise<void> {
 *     // Implementation
 *   }
 *
 *   @AuditLog('delete_booking', 'booking', { includeParams: true })
 *   async deleteBooking(bookingId: string, reason: string): Promise<void> {
 *     // Implementation
 *   }
 * }
 * ```
 */

import { AdminService } from '../services/admin.service';
import type { AdminActionContext } from '../types/admin.types';

/**
 * Decorator options
 */
export interface AuditLogOptions {
  /**
   * Include method parameters in audit details
   * Default: false (for privacy/size considerations)
   */
  includeParams?: boolean;

  /**
   * Include method return value in audit details
   * Default: false (for privacy/size considerations)
   */
  includeResult?: boolean;

  /**
   * Custom function to extract resource ID from parameters
   * Default: uses first parameter
   */
  getResourceId?: (args: unknown[], result: unknown) => string | undefined;

  /**
   * Custom function to build audit details
   * Default: includes params and/or result based on options
   */
  buildDetails?: (args: unknown[], result: unknown) => Record<string, unknown>;
}

/**
 * AuditLog Method Decorator
 *
 * Automatically logs admin actions with configurable detail level.
 *
 * @param action - The action being performed (e.g., 'approve_user', 'delete_booking')
 * @param resourceType - The type of resource being acted upon (e.g., 'user', 'booking')
 * @param options - Optional configuration for audit logging
 */
export function AuditLog(action: string, resourceType: string, options: AuditLogOptions = {}) {
  return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: { adminService?: AdminService }, ...args: unknown[]) {
      // Execute the original method
      let result: unknown;
      let error: unknown;

      try {
        result = await originalMethod.apply(this, args);
      } catch (e) {
        error = e;
        // Re-throw after logging
      }

      // Log the action
      try {
        // Get AdminService instance (should be injected in the class)
        const adminService = (this as { adminService?: AdminService }).adminService;

        if (!adminService) {
          console.warn(
            `AuditLog decorator: AdminService not found on ${target.constructor.name}.` +
              ` Make sure to inject AdminService in your class.`,
          );
          if (error) throw error;
          return result;
        }

        // Build resource ID
        let resourceId: string | undefined;
        if (options.getResourceId) {
          resourceId = options.getResourceId(args, result);
        } else if (args.length > 0 && typeof args[0] === 'string') {
          resourceId = args[0];
        }

        // Build audit details
        let details: Record<string, unknown> | undefined;
        if (options.buildDetails) {
          details = options.buildDetails(args, result);
        } else {
          details = {};
          if (options.includeParams) {
            details.params = args;
          }
          if (options.includeResult && !error) {
            details.result = result;
          }
          if (error) {
            details.error = {
              message: error instanceof Error ? error.message : String(error),
              name: error instanceof Error ? error.name : 'UnknownError',
            };
          }
        }

        // Create audit context
        const context: AdminActionContext = {
          action,
          resourceType,
          resourceId,
          details: Object.keys(details).length > 0 ? details : undefined,
        };

        // Log the action (fire and forget - don't block on logging errors)
        adminService.logAction(context).catch((logError) => {
          console.error('AuditLog decorator: Failed to log action', {
            action,
            resourceType,
            resourceId,
            error: logError,
          });
        });
      } catch (logError) {
        console.error('AuditLog decorator: Error in logging logic', logError);
      }

      // Re-throw original error if any
      if (error) {
        throw error;
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Convenience decorators for common patterns
 */

/**
 * Log approval actions (includes first parameter as resource ID and params in details)
 */
export function AuditApproval(resourceType: string) {
  return AuditLog(`approve_${resourceType}`, resourceType, { includeParams: true });
}

/**
 * Log rejection actions (includes first parameter as resource ID and params in details)
 */
export function AuditRejection(resourceType: string) {
  return AuditLog(`reject_${resourceType}`, resourceType, { includeParams: true });
}

/**
 * Log creation actions (includes result as resource ID if it's a string)
 */
export function AuditCreation(resourceType: string) {
  return AuditLog(`create_${resourceType}`, resourceType, {
    includeParams: true,
    getResourceId: (args: unknown[], result: unknown) =>
      typeof result === 'string' ? result : undefined,
  });
}

/**
 * Log deletion actions (includes first parameter as resource ID)
 */
export function AuditDeletion(resourceType: string) {
  return AuditLog(`delete_${resourceType}`, resourceType, { includeParams: true });
}

/**
 * Log update actions (includes first parameter as resource ID and params in details)
 */
export function AuditUpdate(resourceType: string) {
  return AuditLog(`update_${resourceType}`, resourceType, { includeParams: true });
}
