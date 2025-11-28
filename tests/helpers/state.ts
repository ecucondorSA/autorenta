import { existsSync, readFileSync } from 'node:fs';
import { Page } from '@playwright/test';

type StorageState = {
  cookies?: Array<{ name: string; value: string; domain?: string; path?: string; expires?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'Lax' | 'None' | 'Strict' }>;
  origins?: Array<{ origin: string; localStorage?: Array<{ name: string; value: string }> }>;
};

export type ResumeTarget = {
  entryPoint: string; // e.g. '/marketplace/checkout' o URL absoluta
  storageStatePath?: string; // path a storageState json
  localStorage?: Record<string, string>; // overrides puntuales
  beforeNavigate?: () => Promise<void> | void;
};

const log = (msg: string) => console.log(`[tests/helpers/state] ${msg}`);
const warn = (msg: string) => console.warn(`[tests/helpers/state] ${msg}`);

async function applyStorageState(page: Page, targetUrl: string, storagePath?: string) {
  if (!storagePath || !existsSync(storagePath)) return;

  const raw = readFileSync(storagePath, 'utf-8');
  const state: StorageState = JSON.parse(raw);

  // 1) Cookies (se pueden setear sin navegar)
  if (state.cookies?.length) {
    await page.context().addCookies(state.cookies);
    log(`Cookies aplicadas desde ${storagePath}`);
  }

  // 2) Navegar y setear localStorage por origen
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

  if (state.origins?.length) {
    for (const origin of state.origins) {
      if (!origin.localStorage?.length) continue;
      // Asegurarse de estar en el origen correcto
      if (!page.url().startsWith(origin.origin)) {
        await page.goto(origin.origin, { waitUntil: 'domcontentloaded' });
      }
      for (const item of origin.localStorage) {
        await page.evaluate(
          ([name, value]) => localStorage.setItem(name, value),
          [item.name, item.value],
        );
      }
    }
    log(`localStorage hidratado desde ${storagePath}`);
  }
}

/**
 * Hidratación + navegación directa para reanudar un flujo sin pasar por pasos previos.
 * Usa storageState (cookies/localStorage) y overrides puntuales si se necesitan.
 */
export async function gotoWithState(page: Page, target: ResumeTarget) {
  const targetUrl = target.entryPoint;

  if (target.beforeNavigate) {
    await target.beforeNavigate();
  }

  if (target.storageStatePath) {
    await applyStorageState(page, targetUrl, target.storageStatePath);
  } else {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  }

  if (target.localStorage) {
    for (const [key, value] of Object.entries(target.localStorage)) {
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
    }
    await page.reload({ waitUntil: 'networkidle' });
    log('localStorage overrides aplicados');
  }
}
