/// <reference types="node" />
import { execSync } from 'child_process';
import fs from 'fs';

export async function ensureAuthState(role: string): Promise<string> {
  const path = `tests/.auth/${role}.json`;
  if (fs.existsSync(path)) return path;

  console.log(`Auth state for '${role}' not found. Generating using script...`);
  try {
    execSync(`node scripts/gen-auth-state.mjs ${role}`, { stdio: 'inherit' });
  } catch (err) {
    throw new Error(`Failed to generate auth state for ${role}: ${err}`);
  }

  if (fs.existsSync(path)) return path;
  throw new Error(`Auth state generation finished but file still missing: ${path}`);
}
