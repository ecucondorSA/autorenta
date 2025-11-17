import { FullConfig } from '@playwright/test';
import { ensureAuthState } from './utils';

export default async function globalSetup(config: FullConfig) {
  // Attempt to generate storageState for common roles if missing.
  const roles = ['renter', 'owner', 'admin'];
  for (const role of roles) {
    try {
      // ensureAuthState will call the scripts/gen-auth-state.mjs if file absent
      const path = await ensureAuthState(role);
      console.log(`Global setup: ensured auth state for ${role} → ${path}`);
    } catch (err) {
      console.warn(`Global setup: could not ensure auth for ${role}: ${err}`);
    }
  }
}
