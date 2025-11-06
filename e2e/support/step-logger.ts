import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const artifactsRoot = resolve(__dirname, '..', 'artifacts');

if (!existsSync(artifactsRoot)) {
  mkdirSync(artifactsRoot, { recursive: true });
}

export interface StepLogEntry {
  timestamp: string;
  step: string;
  details?: Record<string, unknown>;
}

export const createStepLogger = (specName: string) => {
  const filePath = resolve(artifactsRoot, `${specName}.steps.jsonl`);
  return (step: string, details?: Record<string, unknown>) => {
    const entry: StepLogEntry = {
      timestamp: new Date().toISOString(),
      step,
      details,
    };
    appendFileSync(filePath, `${JSON.stringify(entry)}\n`, 'utf-8');
  };
};
