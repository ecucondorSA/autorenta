export function registerAuditResources(server, audit) {
    // Resource: Security Audit Summary
    server.registerResource('autorenta://audit/security-summary', async () => {
        const report = await audit.generateAuditReport();
        return {
            text: JSON.stringify(report, null, 2),
            mimeType: 'application/json'
        };
    }, {
        description: 'Comprehensive security audit summary: SECURITY_DEFINER functions, RLS gaps, performance issues'
    });
    // Resource: SECURITY_DEFINER Functions Audit
    server.registerResource('autorenta://audit/security-definer-functions', async () => {
        const functions = await audit.auditSecurityDefinerFunctions();
        const critical = functions.filter(f => f.risk_level === 'critical');
        const high = functions.filter(f => f.risk_level === 'high');
        const medium = functions.filter(f => f.risk_level === 'medium');
        return {
            text: `# Security Definer Functions Audit

## Summary
- Total: ${functions.length}
- Critical Risk: ${critical.length}
- High Risk: ${high.length}
- Medium Risk: ${medium.length}

## Critical Functions (IMMEDIATE ACTION)
${critical.map(f => `- **${f.schema}.${f.function_name}** - ${f.recommendation}`).join('\n')}

## High Risk Functions
${high.map(f => `- **${f.schema}.${f.function_name}** - ${f.recommendation}`).join('\n')}

## Recommendations
1. Audit all critical functions for privilege escalation risks
2. Consider changing to SECURITY INVOKER where appropriate
3. Set explicit search_path and owner for maximum security
4. Document the purpose of each SECURITY DEFINER function
5. Regular security reviews (quarterly)
`,
            mimeType: 'text/markdown'
        };
    }, {
        description: 'Audit of all functions using SECURITY DEFINER with risk assessment'
    });
    // Resource: RLS Policies Audit
    server.registerResource('autorenta://audit/rls-policies', async () => {
        const policies = await audit.auditRLSPolicies();
        const withoutRLS = policies.filter(p => !p.has_rls);
        const withoutPolicies = policies.filter(p => p.has_rls && p.policies_count === 0);
        return {
            text: `# Row Level Security (RLS) Audit

## Summary
- Total Tables Checked: ${policies.length}
- Tables WITHOUT RLS: ${withoutRLS.length}
- Tables with RLS but NO Policies: ${withoutPolicies.length}
- Tables with RLS Policies: ${policies.filter(p => p.policies_count > 0).length}

## CRITICAL: Tables Without RLS
${withoutRLS.map(p => `- \`${p.table_name}\``).join('\n')}

## WARNING: Tables with RLS but No Policies
${withoutPolicies.map(p => `- \`${p.table_name}\` (RLS enabled, but ${p.policies_count} policies)`).join('\n')}

## Tables with RLS Policies
${policies.filter(p => p.policies_count > 0).map(p => `- \`${p.table_name}\` (${p.policies_count} policies: ${p.policy_names.join(', ')})`).join('\n')}

## Immediate Actions
1. Enable RLS on all tables in auth, public, and storage schemas
2. Create restrictive default policies for sensitive tables
3. Test policies thoroughly before deploying
4. Document policy rationale for each table
`,
            mimeType: 'text/markdown'
        };
    }, {
        description: 'Row Level Security policies audit with coverage analysis'
    });
    // Resource: Performance Audit (High Sequential Scans)
    server.registerResource('autorenta://audit/performance', async () => {
        const highScans = await audit.findHighSeqScans();
        const critical = highScans.filter(s => s.seq_scans > 100000);
        const high = highScans.filter(s => s.seq_scans > 10000 && s.seq_scans <= 100000);
        const medium = highScans.filter(s => s.seq_scans > 1000 && s.seq_scans <= 10000);
        return {
            text: `# Performance Audit: Table Scan Analysis

## Summary
- Tables with Critical High Scans (>100k): ${critical.length}
- Tables with High Scans (10k-100k): ${high.length}
- Tables with Medium Scans (1k-10k): ${medium.length}

## Critical Performance Issues (Seq Scans > 100k)
${critical.map(s => `
### \`${s.table_name}\`
- Sequential Scans: ${s.seq_scans.toLocaleString()}
- Suggested Indexes:
${s.suggested_indexes.map(idx => `  \`\`\`sql\n  ${idx}\n  \`\`\``).join('\n')}
`).join('\n')}

## High Priority Tables (Seq Scans 10k-100k)
${high.map(s => `
### \`${s.table_name}\`
- Sequential Scans: ${s.seq_scans.toLocaleString()}
- Suggested Indexes:
${s.suggested_indexes.map(idx => `  \`\`\`sql\n  ${idx}\n  \`\`\``).join('\n')}
`).join('\n')}

## Recommendations
1. Create suggested indexes immediately for critical tables
2. Test query performance after index creation
3. Monitor seq_scans quarterly
4. Consider query rewrites for high-scan tables
5. Use EXPLAIN ANALYZE to validate index effectiveness
`,
            mimeType: 'text/markdown'
        };
    }, {
        description: 'Performance audit analyzing high sequential scans and suggesting indexes'
    });
    // Resource: Schema Analysis
    server.registerResource('autorenta://audit/schema-analysis', async () => {
        const analysis = await audit.analyzeSchema();
        return {
            text: JSON.stringify(analysis, null, 2),
            mimeType: 'application/json'
        };
    }, {
        description: 'Overall schema analysis with key metrics'
    });
}
