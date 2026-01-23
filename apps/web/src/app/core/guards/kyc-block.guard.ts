import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FaceVerificationService } from '@core/services/verification/face-verification.service';

/**
 * Guard that prevents access to routes for users who are KYC blocked
 * (e.g., after 5 failed face verification attempts)
 *
 * Usage in routes:
 * {
 *   path: 'verification/face',
 *   component: FaceVerificationComponent,
 *   canActivate: [kycBlockGuard],
 * }
 */
export const kycBlockGuard: CanActivateFn = async () => {
  const faceVerificationService = inject(FaceVerificationService);
  const router = inject(Router);

  try {
    const blockStatus = await faceVerificationService.isUserKycBlocked();

    if (blockStatus.blocked) {
      // Redirect to blocked page with reason
      router.navigate(['/verification/blocked'], {
        queryParams: {
          reason: blockStatus.reason,
          attempts: blockStatus.attempts,
        },
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking KYC block status:', error);
    // Allow access on error (fail open for UX, server will block anyway)
    return true;
  }
};

/**
 * Guard that checks if user is KYC blocked and shows a warning
 * but still allows access (for informational purposes)
 */
export const kycBlockWarningGuard: CanActivateFn = async () => {
  const faceVerificationService = inject(FaceVerificationService);

  try {
    // Just update the status signal, don't block navigation
    // Components can read kycBlockStatus signal for warnings
    await faceVerificationService.isUserKycBlocked();
    return true;
  } catch (error) {
    console.error('Error checking KYC block status:', error);
    return true;
  }
};
