import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, rename, stat, readFile } from 'node:fs/promises';
import path from 'node:path';

type Config = {
  ttlDays: number;
  apply: boolean;
  failOnFound: boolean;
  docsDir: string;
  archiveRoot: string;
  keepFile: string;
};

type Candidate = {
  relativePath: string;
  absolutePath: string;
  sourceTimestampMs: number;
  source: 'git' | 'fs';
};

function parseArgs(argv: string[]): Config {
  const cfg: Config = {
    ttlDays: 120,
    apply: false,
    failOnFound: false,
    docsDir: 'docs',
    archiveRoot: 'docs/archived-reports',
    keepFile: 'docs/.ttl-keep',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--apply') cfg.apply = true;
    else if (arg === '--fail-on-found') cfg.failOnFound = true;
    else if (arg === '--ttl-days' && argv[i + 1]) {
      cfg.ttlDays = Number(argv[i + 1]);
      i += 1;
    } else if (arg === '--docs-dir' && argv[i + 1]) {
      cfg.docsDir = argv[i + 1];
      i += 1;
    } else if (arg === '--archive-root' && argv[i + 1]) {
      cfg.archiveRoot = argv[i + 1];
      i += 1;
    } else if (arg === '--keep-file' && argv[i + 1]) {
      cfg.keepFile = argv[i + 1];
      i += 1;
    }
  }

  if (!Number.isFinite(cfg.ttlDays) || cfg.ttlDays <= 0) {
    throw new Error(`Invalid --ttl-days value: ${cfg.ttlDays}`);
  }

  return cfg;
}

function normalizeSlashes(input: string): string {
  return input.split(path.sep).join('/');
}

async function collectFilesRecursively(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFilesRecursively(fullPath)));
      continue;
    }

    if (entry.isFile()) files.push(fullPath);
  }

  return files;
}

function tryGetGitTimestampMs(filePath: string): number | null {
  try {
    const output = execSync(`git log -1 --format=%ct -- "${filePath}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (!output) return null;
    const seconds = Number(output);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    return seconds * 1000;
  } catch {
    return null;
  }
}

async function loadKeepPaths(keepFile: string): Promise<Set<string>> {
  if (!existsSync(keepFile)) return new Set<string>();

  const content = await readFile(keepFile, 'utf8');
  const keep = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => normalizeSlashes(line));

  return new Set<string>(keep);
}

function isDocsCandidate(relativePath: string): boolean {
  const normalized = normalizeSlashes(relativePath);

  if (!normalized.startsWith('docs/')) return false;
  if (normalized.startsWith('docs/archived-reports/')) return false;
  if (normalized === 'docs/README.md') return false;
  if (normalized === 'docs/ROOT_HYGIENE.md') return false;
  if (normalized.endsWith('/README.md')) return false;

  return normalized.endsWith('.md') || normalized.endsWith('.csv');
}

function formatDate(tsMs: number): string {
  return new Date(tsMs).toISOString().slice(0, 10);
}

function ageInDays(tsMs: number): number {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((Date.now() - tsMs) / dayMs);
}

async function moveWithGit(sourcePath: string, destPath: string): Promise<void> {
  await mkdir(path.dirname(destPath), { recursive: true });

  try {
    execSync(`git mv "${sourcePath}" "${destPath}"`, { stdio: 'ignore' });
  } catch {
    await rename(sourcePath, destPath);
  }
}

async function main(): Promise<void> {
  const cfg = parseArgs(process.argv.slice(2));
  const keepPaths = await loadKeepPaths(cfg.keepFile);

  const allFiles = await collectFilesRecursively(cfg.docsDir);
  const candidates: Candidate[] = [];

  for (const absolutePath of allFiles) {
    const relativePath = normalizeSlashes(path.relative(process.cwd(), absolutePath));

    if (!isDocsCandidate(relativePath)) continue;
    if (keepPaths.has(relativePath)) continue;

    const gitTs = tryGetGitTimestampMs(relativePath);
    if (gitTs !== null) {
      candidates.push({ relativePath, absolutePath, sourceTimestampMs: gitTs, source: 'git' });
      continue;
    }

    const fsTs = (await stat(absolutePath)).mtimeMs;
    candidates.push({ relativePath, absolutePath, sourceTimestampMs: fsTs, source: 'fs' });
  }

  const stale = candidates
    .filter((c) => ageInDays(c.sourceTimestampMs) >= cfg.ttlDays)
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  console.log(`Docs TTL check`);
  console.log(`- ttlDays: ${cfg.ttlDays}`);
  console.log(`- mode: ${cfg.apply ? 'apply' : 'dry-run'}`);
  console.log(`- candidates: ${candidates.length}`);
  console.log(`- stale: ${stale.length}`);

  if (stale.length === 0) {
    console.log('No stale docs found.');
    return;
  }

  const archiveBatch = `ttl-archive-${formatDate(Date.now())}`;

  for (const item of stale) {
    const ageDays = ageInDays(item.sourceTimestampMs);
    console.log(`* ${item.relativePath} (${ageDays}d, source=${item.source})`);

    if (!cfg.apply) continue;

    const relativeFromDocs = normalizeSlashes(path.relative('docs', item.relativePath));
    const destination = normalizeSlashes(path.join(cfg.archiveRoot, archiveBatch, relativeFromDocs));
    await moveWithGit(item.relativePath, destination);
  }

  if (!cfg.apply) {
    console.log('Dry-run complete. Use --apply to archive stale docs.');
    if (cfg.failOnFound) process.exit(2);
    return;
  }

  console.log(`Archived ${stale.length} docs to ${cfg.archiveRoot}/${archiveBatch}/`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
