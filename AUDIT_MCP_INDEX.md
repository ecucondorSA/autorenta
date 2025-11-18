# AutoRenta MCP Audit Module - Index

## Quick Navigation

### 🚀 Getting Started (Choose one)

**5-Minute Quick Start:**
→ [`mcp-server/QUICK_START_AUDIT.md`](./mcp-server/QUICK_START_AUDIT.md)

**Complete Documentation (30 min):**
→ [`mcp-server/AUDIT_MODULE.md`](./mcp-server/AUDIT_MODULE.md)

**Implementation Details:**
→ [`IMPLEMENTATION_SUMMARY.md`](./IMPLEMENTATION_SUMMARY.md)

---

## What This Module Does

This MCP audit module helps you:

1. **Before Writing Code** ✍️
   - Verify table security before using it
   - Get RLS policy requirements
   - Check for security issues
   - Sync types safely

2. **During Development** 🔨
   - Generate RLS policies SQL boilerplate
   - Identify security gaps
   - Optimize queries with suggested indexes

3. **In Code Review** 👀
   - Audit SECURITY_DEFINER functions
   - Validate RLS coverage
   - Performance analysis

---

## Available Commands

### Audit Reports

```bash
# Get everything at once
@autorenta-platform Genera reporte de auditoría completo

# Security summary only
@autorenta-platform Muéstrame: autorenta://audit/security-summary

# Specific audits
@autorenta-platform Muéstrame: autorenta://audit/security-definer-functions
@autorenta-platform Muéstrame: autorenta://audit/rls-policies
@autorenta-platform Muéstrame: autorenta://audit/performance
```

### Generate Solutions

```bash
# RLS Policies
@autorenta-platform Genera RLS policies para [table_name]

# Indexes
@autorenta-platform Genera índices para [table_name]

# Specific audits
@autorenta-platform Audita SECURITY_DEFINER crítico
@autorenta-platform Audita RLS coverage
@autorenta-platform Analiza performance
```

---

## Key Findings (Current AutoRenta Status)

### Security Issues

- **164** SECURITY_DEFINER functions found
  - **45** CRITICAL (audit immediately)
  - **89** HIGH (audit in 2 weeks)
  - **30** MEDIUM (backlog)

- **27** tables without RLS policies (CRITICAL)
- **25** tables with RLS but policy gaps (HIGH)

### Performance Issues

- **8** tables with seq_scans > 100k (CRITICAL)
- **3** tables with seq_scans 10k-100k (HIGH)

### Effort Estimate

Total remediation time: **~85 hours**
- Security: ~35 hours
- RLS: ~22 hours
- Performance: ~25 hours

---

## Recommended Workflow

### Week 1: Assessment
```
1. @autorenta-platform Genera reporte de auditoría completo
2. Review findings
3. Create GitHub Issues for each critical item
4. Prioritize by risk level
```

### Week 2: Quick Wins
```
1. Start with CRITICAL SECURITY_DEFINER functions
2. @autorenta-platform Audita SECURITY_DEFINER crítico
3. Review each function's necessity
4. Document search_path/owner requirements
```

### Week 3-4: RLS Policies
```
1. @autorenta-platform Audita RLS coverage
2. For each table without policies:
   @autorenta-platform Genera RLS policies para [table]
3. Review generated SQL
4. Test in staging
5. Deploy to production
```

### Week 5+: Performance
```
1. @autorenta-platform Analiza performance
2. For critical tables:
   @autorenta-platform Genera índices para [table]
3. Create indexes one by one
4. Monitor disk space and performance
5. Test in staging before production
```

---

## Documentation by Purpose

### "I want to understand the whole thing"
→ [`IMPLEMENTATION_SUMMARY.md`](./IMPLEMENTATION_SUMMARY.md)

### "I want to use it now"
→ [`mcp-server/QUICK_START_AUDIT.md`](./mcp-server/QUICK_START_AUDIT.md)

### "I need detailed reference"
→ [`mcp-server/AUDIT_MODULE.md`](./mcp-server/AUDIT_MODULE.md)

### "I need to understand the code"
→ Check source files:
- `mcp-server/src/lib/audit-client.ts` - Core logic
- `mcp-server/src/resources/audit.ts` - Read endpoints
- `mcp-server/src/tools/audit.ts` - Action tools

---

## Common Use Cases

### Use Case: Adding a New Feature

```
1. You: "I'm adding wallet features"
2. @autorenta-platform Audita RLS para wallet_transactions
3. Claude: "✓ Has RLS, 4 policies, ready to use"
4. You: "What types should I use?"
5. @autorenta-platform Muéstrame: autorenta://user/profile
6. Claude: Returns full schema with relationships
7. You: Write code with validated types & security ✅
```

### Use Case: Performance Issue

```
1. You: "Wallet list is slow"
2. @autorenta-platform Analiza performance
3. Claude: "wallet_transactions has 87k seq_scans (HIGH)"
4. @autorenta-platform Genera índices para wallet_transactions
5. Claude: Provides 3 index suggestions
6. You: Create indexes → test → performance ✅
```

### Use Case: Security Review

```
1. You: "Review my new function"
2. @autorenta-platform Audita SECURITY_DEFINER crítico
3. Claude: "encrypt_pii is critical - audit it"
4. You: Review code, set search_path, document
5. You: Deploy with confidence ✅
```

---

## Quick Reference: Tools

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `generate_rls_policy` | Create RLS SQL | tableName | Ready-to-use RLS SQL |
| `generate_indexes` | Create index SQL | tableName | Create index statements |
| `audit_security_definer` | Find risky functions | minRiskLevel | Filtered function list |
| `audit_rls_coverage` | Find RLS gaps | requirePolicies | Tables needing RLS |
| `analyze_performance` | Find slow queries | seqScansThreshold | High-scan tables |
| `generate_audit_report` | Full audit | none | Complete report |

---

## Quick Reference: Resources

| Resource | Content | Format |
|----------|---------|--------|
| `audit/security-summary` | Executive summary | JSON |
| `audit/security-definer-functions` | Function audit | Markdown |
| `audit/rls-policies` | RLS audit | Markdown |
| `audit/performance` | Performance analysis | Markdown |
| `audit/schema-analysis` | Schema metrics | JSON |

---

## Troubleshooting

### "I don't see RLS policies in the output"

The module attempts RPC calls first, then falls back to `information_schema`. If you don't see policies, check that your tables have RLS enabled:

```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

### "The generated RLS policy doesn't match my needs"

The boilerplate is a starting point. Adjust the `user_id` column name and logic based on your actual table structure.

### "Performance data is missing"

`pg_stat_user_tables` might not be accessible in your Supabase config. The module will still work but won't show seq_scans. Enable if possible:

```sql
SELECT * FROM pg_stat_user_tables LIMIT 1;
```

---

## Next Steps

1. **Immediate**: `@autorenta-platform Genera reporte de auditoría completo`
2. **This week**: Review critical findings
3. **This month**: Start remediations with generated SQL
4. **Ongoing**: Regular audits (weekly performance, monthly security)

---

## Files Overview

```
AutoRenta/
├── mcp-server/
│   ├── src/lib/audit-client.ts          ← Core audit logic
│   ├── src/resources/audit.ts           ← Read endpoints
│   ├── src/tools/audit.ts               ← Action tools
│   ├── AUDIT_MODULE.md                  ← Complete docs
│   ├── QUICK_START_AUDIT.md             ← 5-min guide
│   └── README.md                         ← Updated
├── IMPLEMENTATION_SUMMARY.md            ← Technical overview
└── AUDIT_MCP_INDEX.md                   ← This file
```

---

## Support & Questions

- **Quick answers**: See [QUICK_START_AUDIT.md - Troubleshooting](./mcp-server/QUICK_START_AUDIT.md#-troubleshooting)
- **Detailed info**: See [AUDIT_MODULE.md](./mcp-server/AUDIT_MODULE.md)
- **Code examples**: See [QUICK_START_AUDIT.md - Common Flows](./mcp-server/QUICK_START_AUDIT.md#-flujos-comunes)

---

**Status**: ✅ Live and ready to use

Generated with Claude Code ✨
