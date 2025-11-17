#!/usr/bin/env python3
import csv
import re
from pathlib import Path

out = []

# Parse RLS without policies -> HIGH severity
rls = Path('reports/rls_without_policies.csv')
if rls.exists():
    with rls.open() as f:
        reader = csv.DictReader(f)
        for r in reader:
            out.append({
                'issue_type':'RLS_NO_POLICY',
                'severity':'HIGH',
                'object_type':'table',
                'schema':r.get('schema'),
                'object_name':r.get('table_name'),
                'metric':'rls_enabled_no_policies',
                'recommendation':'Create restrictive RLS policies',
                'estimated_effort':'30m'
            })

# Parse security definer functions -> HIGH
sdf = Path('reports/security_definer_functions.csv')
if sdf.exists():
    with sdf.open() as f:
        reader = csv.DictReader(f)
        for r in reader:
            out.append({
                'issue_type':'FUNCTION_SECURITY_DEFINER',
                'severity':'HIGH',
                'object_type':'function',
                'schema':r.get('schema'),
                'object_name':r.get('function_name'),
                'metric':'security_definer',
                'recommendation':'Audit function for least privilege; consider SECURITY INVOKER or set search_path/owner',
                'estimated_effort':'45m'
            })

# Parse table-stats (text) to find tables with high seq scans or big sizes
ts = Path('reports/table-stats.json')
if ts.exists():
    text = ts.read_text()
    # Each line has format: schema.table | Table size | Index size | Total size | Estimated row count | Seq scans
    lines = [l.strip() for l in text.splitlines() if l.strip() and '|' in l]
    for l in lines:
        parts = [p.strip() for p in re.split(r'\s*\|\s*', l)]
        if len(parts) < 6:
            continue
        name = parts[0]
        seq_scans = parts[5].replace(',', '')
        try:
            seq = int(seq_scans)
        except:
            seq = 0
        # pick thresholds
        if seq > 1000:
            schema, table = name.split('.') if '.' in name else ('public', name)
            out.append({
                'issue_type':'HIGH_SEQ_SCANS',
                'severity':'HIGH' if seq>10000 else 'MEDIUM',
                'object_type':'table',
                'schema':schema,
                'object_name':table,
                'metric':f'seq_scans={seq}',
                'recommendation':'Add indexes or fix queries; run EXPLAIN ANALYZE on heavy queries',
                'estimated_effort':'1h'
            })

# Deduplicate by object (keep highest severity)
sev_rank = {'CRITICAL':3,'HIGH':2,'MEDIUM':1,'LOW':0}
keyed = {}
for item in out:
    k = (item['object_type'], item['schema'], item['object_name'], item['issue_type'])
    prev = keyed.get(k)
    if not prev or sev_rank.get(item['severity'],1) > sev_rank.get(prev['severity'],1):
        keyed[k] = item

rows = list(keyed.values())
# sort by severity then issue_type
rows.sort(key=lambda r: ( -sev_rank.get(r['severity'],1), r['issue_type']))

# write CSV
Path('reports').mkdir(exist_ok=True)
with open('reports/backlog_prioritized_20251117.csv','w',newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['issue_type','severity','object_type','schema','object_name','metric','recommendation','estimated_effort'])
    writer.writeheader()
    for r in rows:
        writer.writerow(r)

print('Wrote reports/backlog_prioritized_20251117.csv with', len(rows), 'items')
