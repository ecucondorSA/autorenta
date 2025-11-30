import { z } from 'zod';
export function registerAuditTools(server, audit) {
    // Tool: Generate RLS Policy Boilerplate
    server.registerTool('generate_rls_policy', async (args) => {
        const schema = z.object({
            tableName: z.string().min(1),
            userIdColumn: z.string().optional().default('user_id')
        });
        const { tableName, userIdColumn } = schema.parse(args);
        const boilerplate = audit.generateRLSPolicyBoilerplate(tableName, userIdColumn);
        return {
            success: true,
            message: `Generated RLS policy boilerplate for table: ${tableName}`,
            sql: boilerplate,
            nextSteps: [
                'Review the generated policies',
                'Adjust user_id matching logic if needed',
                'Test policies thoroughly in staging',
                'Deploy to production with confidence'
            ]
        };
    }, {
        description: 'Generate RLS policy boilerplate SQL for a specific table',
        inputSchema: {
            type: 'object',
            properties: {
                tableName: {
                    type: 'string',
                    description: 'Name of the table to create RLS policies for'
                },
                userIdColumn: {
                    type: 'string',
                    description: 'Column name for user_id (default: user_id)'
                }
            },
            required: ['tableName']
        }
    });
    // Tool: Generate Index Creation SQL
    server.registerTool('generate_indexes', async (args) => {
        const schema = z.object({
            tableName: z.string().min(1)
        });
        const { tableName } = schema.parse(args);
        const indexes = audit.generateIndexSQL(tableName);
        return {
            success: true,
            message: `Generated ${indexes.length} index suggestions for table: ${tableName}`,
            indexes: indexes.map((sql, idx) => ({
                index_number: idx + 1,
                sql,
                estimated_benefit: 'Medium to High - depends on query patterns'
            })),
            recommendations: [
                'Test each index individually in staging',
                'Use EXPLAIN ANALYZE to measure performance impact',
                'Monitor disk space usage after index creation',
                'Schedule creation during low-traffic periods'
            ]
        };
    }, {
        description: 'Generate SQL for index creation based on scan analysis',
        inputSchema: {
            type: 'object',
            properties: {
                tableName: {
                    type: 'string',
                    description: 'Table name to generate indexes for'
                }
            },
            required: ['tableName']
        }
    });
    // Tool: Audit Security Definer Functions
    server.registerTool('audit_security_definer', async (args) => {
        const schema = z.object({
            minRiskLevel: z.enum(['critical', 'high', 'medium']).optional().default('high')
        });
        const { minRiskLevel } = schema.parse(args);
        const functions = await audit.auditSecurityDefinerFunctions();
        const riskLevels = { critical: 3, high: 2, medium: 1 };
        const minRisk = riskLevels[minRiskLevel];
        const filtered = functions.filter(f => riskLevels[f.risk_level] >= minRisk);
        return {
            success: true,
            total_functions: functions.length,
            filtered_by_risk_level: minRiskLevel,
            matching_functions_count: filtered.length,
            functions: filtered.map(f => ({
                function: `${f.schema}.${f.function_name}`,
                risk_level: f.risk_level,
                recommendation: f.recommendation
            })),
            audit_checklist: [
                '[ ] Review each function for unnecessary privilege elevation',
                '[ ] Verify search_path is explicitly set',
                '[ ] Check for SQL injection vulnerabilities',
                '[ ] Confirm owner is the least-privileged role',
                '[ ] Document why SECURITY DEFINER is necessary',
                '[ ] Schedule security review (quarterly minimum)'
            ]
        };
    }, {
        description: 'Audit SECURITY_DEFINER functions with risk filtering',
        inputSchema: {
            type: 'object',
            properties: {
                minRiskLevel: {
                    type: 'string',
                    enum: ['critical', 'high', 'medium'],
                    description: 'Minimum risk level to include in results'
                }
            }
        }
    });
    // Tool: Audit RLS Coverage
    server.registerTool('audit_rls_coverage', async (args) => {
        const schema = z.object({
            requirePolicies: z.boolean().optional().default(true)
        });
        const { requirePolicies } = schema.parse(args);
        const policies = await audit.auditRLSPolicies();
        const gaps = requirePolicies
            ? policies.filter(p => !p.has_rls || p.policies_count === 0)
            : policies.filter(p => !p.has_rls);
        return {
            success: true,
            total_tables: policies.length,
            tables_with_rls: policies.filter(p => p.has_rls).length,
            tables_with_policies: policies.filter(p => p.policies_count > 0).length,
            tables_with_gaps: gaps.length,
            gaps: gaps.map(g => ({
                table: g.table_name,
                has_rls: g.has_rls,
                policies: g.policies_count,
                action_required: !g.has_rls ? 'Enable RLS and create policies' : 'Create policies for existing RLS'
            })),
            remediation_steps: [
                '1. Review each table\'s security requirements',
                '2. Enable RLS: ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;',
                '3. Create policies using generate_rls_policy tool',
                '4. Test policies with different user roles',
                '5. Monitor policy effectiveness in production'
            ]
        };
    }, {
        description: 'Audit RLS policy coverage and identify gaps',
        inputSchema: {
            type: 'object',
            properties: {
                requirePolicies: {
                    type: 'boolean',
                    description: 'Require tables to have both RLS enabled AND policies (default: true)'
                }
            }
        }
    });
    // Tool: Performance Analysis
    server.registerTool('analyze_performance', async (args) => {
        const schema = z.object({
            seqScansThreshold: z.number().min(0).optional().default(10000)
        });
        const { seqScansThreshold } = schema.parse(args);
        const scans = await audit.findHighSeqScans(seqScansThreshold);
        return {
            success: true,
            threshold: seqScansThreshold,
            tables_above_threshold: scans.length,
            tables: scans.map(s => ({
                table: s.table_name,
                seq_scans: s.seq_scans.toLocaleString(),
                index_efficiency: `${(s.index_scan_ratio * 100).toFixed(2)}%`,
                action: s.seq_scans > 100000 ? 'CRITICAL' : 'HIGH'
            })),
            optimization_steps: [
                '1. Identify frequently-used WHERE clauses in slow queries',
                '2. Use EXPLAIN ANALYZE to see scan patterns',
                '3. Create indexes based on recommendations',
                '4. Test performance improvements',
                '5. Monitor metrics after deployment'
            ],
            next_action: 'Use generate_indexes tool to get specific SQL'
        };
    }, {
        description: 'Analyze table performance and sequential scans',
        inputSchema: {
            type: 'object',
            properties: {
                seqScansThreshold: {
                    type: 'number',
                    description: 'Threshold for sequential scans to flag as high (default: 10000)'
                }
            }
        }
    });
    // Tool: Generate Comprehensive Audit Report
    server.registerTool('generate_audit_report', async (args) => {
        const report = await audit.generateAuditReport();
        const priorityActions = [
            ...report.critical_functions.map((f) => ({
                priority: 'CRITICAL',
                item: `Audit function: ${f.function_name}`,
                category: 'Security'
            })),
            ...report.rls_tables_without_policies.map((t) => ({
                priority: 'HIGH',
                item: `Create RLS policies for: ${t.table_name}`,
                category: 'Security'
            })),
            ...report.high_seq_scans.map((s) => ({
                priority: 'HIGH',
                item: `Optimize indexes for: ${s.table_name}`,
                category: 'Performance'
            }))
        ];
        return {
            success: true,
            summary: report.summary,
            recommendations: report.recommendations,
            priority_actions: priorityActions.slice(0, 10),
            estimated_effort_hours: {
                security: report.summary.security_issues * 0.75,
                rls: report.summary.rls_gaps * 0.5,
                performance: report.summary.missing_indexes * 1.0
            },
            total_effort_hours: (report.summary.security_issues * 0.75) + (report.summary.rls_gaps * 0.5) + (report.summary.missing_indexes * 1.0)
        };
    }, {
        description: 'Generate comprehensive audit report with prioritized action items',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    });
}
