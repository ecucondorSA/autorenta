#!/usr/bin/env python3
"""
Crea issues en GitHub a partir de `docs/auto-task-issues.md`.

Requisitos:
- `gh` (GitHub CLI) autenticado o `GH_TOKEN` exportado
- Python 3.8+

Uso:
  python3 scripts/create_issues_from_docs.py [--dry-run] [--file docs/auto-task-issues.md] [--repo owner/repo] [--labels auto-task,needs-scope] [--assignee @username]

El script parsea secciones separadas por `---` y extrae la línea con `Título` y el primer bloque de código necesario para `Body`.

ADVERTENCIA: Revisa `--dry-run` primero para confirmar que el parsing funciona correctamente.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path


def parse_issues(md_text: str):
    parts = [p.strip() for p in md_text.split('\n---\n') if p.strip()]
    issues = []
    for part in parts:
        # look for 'Título:' line
        title = None
        body = None
        lines = part.splitlines()
        # Find title code block: a segment after a line '**Título:**' where title is inside a code fence
        for i, line in enumerate(lines):
            if line.strip().startswith('**Título'):
                # search forward for code fence start
                for j in range(i+1, len(lines)):
                    if lines[j].strip().startswith('```'):
                        # collect until end fence
                        j += 1
                        txt_lines = []
                        while j < len(lines) and not lines[j].strip().startswith('```'):
                            txt_lines.append(lines[j])
                            j += 1
                        title = '\n'.join(txt_lines).strip()
                        break
                if title:
                    break
        # body: find the code fence right after 'Body' or the large code block
        body_found = False
        for i, line in enumerate(lines):
            if line.strip().startswith('**Body'):
                # search for the next code fence
                for j in range(i+1, len(lines)):
                    if lines[j].strip().startswith('```'):
                        j += 1
                        txt_lines = []
                        while j < len(lines) and not lines[j].strip().startswith('```'):
                            txt_lines.append(lines[j])
                            j += 1
                        body = '\n'.join(txt_lines).strip()
                        body_found = True
                        break
                if body_found:
                    break
        # fallback: if no 'Body' header, find the biggest code block
        if not body:
            fence_idxs = [i for i, l in enumerate(lines) if l.strip().startswith('```')]
            if len(fence_idxs) >= 2:
                # take the largest block
                blocks = []
                for k in range(0, len(fence_idxs), 2):
                    if k+1 < len(fence_idxs):
                        start = fence_idxs[k]+1
                        end = fence_idxs[k+1]
                        blocks.append('\n'.join(lines[start:end]))
                if blocks:
                    body = max(blocks, key=lambda b: len(b.splitlines()))
        if title and body:
            issues.append({'title': title, 'body': body})
    return issues


def create_issue(repo, title, body, labels=None, assignee=None, dry_run=True):
    cmd = ['gh', 'issue', 'create', '--repo', repo, '--title', title, '--body', body]
    if labels:
        cmd += ['--label', labels]
    if assignee:
        cmd += ['--assignee', assignee]
    if dry_run:
        print('[DRY RUN] Would run:', ' '.join(cmd))
        return True
    print('Running:', ' '.join(cmd))
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        print('Error creating issue:', res.stderr.decode(), file=sys.stderr)
        return False
    print('Created issue:', res.stdout.decode())
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', default='docs/auto-task-issues.md')
    parser.add_argument('--repo', default=None, help='owner/repo to create issues in (default: current repo)')
    parser.add_argument('--labels', default='auto-task,needs-scope')
    parser.add_argument('--assignee', default=None)
    parser.add_argument('--dry-run', action='store_true', default=True)
    args = parser.parse_args()

    path = Path(args.file)
    if not path.exists():
        print('File not found:', path)
        sys.exit(1)
    md_text = path.read_text(encoding='utf-8')
    issues = parse_issues(md_text)
    if not issues:
        print('No issues parsed. Check file format.')
        sys.exit(1)
    print(f'Parsed {len(issues)} issues from {path}')

    repo = args.repo
    if not repo:
        # try to get current repo from gh
        try:
            out = subprocess.run(['gh', 'repo', 'view', '--json', 'nameWithOwner'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if out.returncode == 0:
                data = json.loads(out.stdout)
                repo = data['nameWithOwner']
            else:
                print('No repo detected, please pass --repo owner/repo')
                sys.exit(1)
        except Exception as e:
            print('Error detecting repo:', e)
            sys.exit(1)

    for issue in issues:
        print('\n=== Creating:', issue['title'])
        ok = create_issue(repo, issue['title'], issue['body'], labels=args.labels, assignee=args.assignee, dry_run=args.dry_run)
        if not ok:
            print('Stopping due to error')
            sys.exit(1)

    print('\nAll done.')

if __name__ == '__main__':
    main()
