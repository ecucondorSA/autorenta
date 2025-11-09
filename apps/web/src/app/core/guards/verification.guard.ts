import { Injectable, inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { VerificationService } from '../services/verification.service';

/**
 * Guard to check if user is verified (VERIFICADO status)
 * Used for protected features like publishing cars
 */
@Injectable({
  providedIn: 'root',
})
export class VerificationGuard {
  private readonly verificationService = inject(VerificationService);
  private readonly router = inject(Router);

  canMatch: CanMatchFn = async () => {
    // Load the current verification status
    await this.verificationService.loadStatuses();

    const statuses = this.verificationService.statuses();

    // Check if user has at least one verification with VERIFICADO status
    // Typically checking for 'owner' role verification for publishing cars
    const isVerified = statuses.some((status) => status.status === 'VERIFICADO');

    if (isVerified) {
      return true;
    }

    // Redirect to verification page if not verified
    this.router.navigate(['/verification']);
    return false;
  };
}

/**
 * Guard to check if user has missing documents
 * Returns true if user has missing docs (can be used to show warnings)
 */
@Injectable({
  providedIn: 'root',
})
export class HasMissingDocsGuard {
  private readonly verificationService = inject(VerificationService);

  async hasMissingDocs(): Promise<boolean> {
    await this.verificationService.loadStatuses();
    const statuses = this.verificationService.statuses();
    // Check if any verification has missing docs
    return statuses.some((status) => (status.missing_docs?.length ?? 0) > 0);
  }
}

/**
 * Resolver to load verification status before component initialization
 */
@Injectable({
  providedIn: 'root',
})
export class VerificationStatusResolver {
  private readonly verificationService = inject(VerificationService);

  async resolve() {
    await this.verificationService.loadStatuses();
    return this.verificationService.statuses();
  }
}
