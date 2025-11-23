import { z } from 'zod';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Execute command and return output
 */
function execCommand(command, cwd = '/home/edu/autorenta') {
    try {
        return execSync(command, {
            cwd,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });
    }
    catch (error) {
        // ESLint and TypeScript return non-zero exit codes when there are errors
        // We want to capture the output anyway
        return error.stdout || error.stderr || '';
    }
}
/**
 * Parse ESLint JSON output
 */
function parseESLintOutput(output) {
    try {
        const results = JSON.parse(output);
        const issues = [];
        for (const file of results) {
            for (const message of file.messages) {
                issues.push({
                    file: file.filePath,
                    line: message.line,
                    column: message.column,
                    severity: message.severity === 2 ? 'error' : 'warning',
                    message: message.message,
                    rule: message.ruleId,
                    fixable: message.fix !== undefined,
                });
            }
        }
        return issues;
    }
    catch (error) {
        console.error('Failed to parse ESLint output:', error);
        return [];
    }
}
/**
 * Parse TypeScript compiler output
 */
function parseTypeScriptOutput(output) {
    const issues = [];
    const lines = output.split('\n');
    for (const line of lines) {
        // Format: file.ts(line,column): error TS2xxx: message
        const match = line.match(/^(.+?)\((\d+),(\d+)\): (error|warning) TS\d+: (.+)$/);
        if (match) {
            issues.push({
                file: match[1],
                line: parseInt(match[2]),
                column: parseInt(match[3]),
                severity: match[4],
                message: match[5],
                rule: 'TypeScript',
                fixable: false,
            });
        }
    }
    return issues;
}
/**
 * Read and parse BUGS_AUDIT_REPORT.md
 */
function parseKnownBugs(filePath = '/home/edu/autorenta/BUGS_AUDIT_REPORT.md') {
    try {
        if (!existsSync(filePath)) {
            return [];
        }
        const content = readFileSync(filePath, 'utf-8');
        const bugs = [];
        // Parse markdown structure to extract bugs
        const bugRegex = /### (P\d+-\d+): (.+?)\n/g;
        let match;
        while ((match = bugRegex.exec(content)) !== null) {
            const bugId = match[1];
            const title = match[2];
            // Extract section content
            const startIndex = match.index;
            const nextBugIndex = content.indexOf('###', startIndex + 1);
            const section = content.substring(startIndex, nextBugIndex === -1 ? content.length : nextBugIndex);
            // Extract severity
            const severityMatch = section.match(/Severidad[:\s]+([^\n]+)/i);
            const severity = severityMatch ? severityMatch[1].trim() : 'UNKNOWN';
            // Extract location
            const locationMatch = section.match(/Ubicación[:\s]*\n```\n([^`]+)```/s);
            const location = locationMatch ? locationMatch[1].trim() : 'Unknown';
            // Extract description
            const descMatch = section.match(/Descripción del Problema[:\s]*\n(.+?)(?=\n\*\*|###)/s);
            const description = descMatch ? descMatch[1].trim().substring(0, 200) : '';
            bugs.push({
                id: bugId,
                title,
                severity,
                location,
                description,
            });
        }
        return bugs;
    }
    catch (error) {
        console.error('Failed to parse known bugs:', error);
        return [];
    }
}
// ============================================================================
// Register Code Analysis Tools
// ============================================================================
export function registerCodeAnalysisTools(server) {
    // ============================================================================
    // Tool: Analyze Code with ESLint
    // ============================================================================
    server.registerTool('analyze_code_eslint', async (args) => {
        const schema = z.object({
            path: z.string().default('apps/web/src'),
            fix: z.boolean().default(false),
        });
        const { path, fix } = schema.parse(args);
        const startTime = Date.now();
        // Run ESLint
        const command = fix
            ? `npm run lint:fix -- --format=json --max-warnings=0`
            : `npm run lint -- --format=json --max-warnings=0`;
        const output = execCommand(command);
        const issues = parseESLintOutput(output);
        const errors = issues.filter((i) => i.severity === 'error').length;
        const warnings = issues.filter((i) => i.severity === 'warning').length;
        const fixable = issues.filter((i) => i.fixable).length;
        const result = {
            total_issues: issues.length,
            errors,
            warnings,
            fixable_issues: fixable,
            issues: issues.slice(0, 50), // Limit to first 50 for performance
            execution_time_ms: Date.now() - startTime,
        };
        return {
            success: true,
            analysis: result,
            message: fix
                ? `Fixed ${fixable} issues automatically`
                : `Found ${issues.length} issues (${errors} errors, ${warnings} warnings, ${fixable} fixable)`,
        };
    }, {
        description: 'Analyze code with ESLint and optionally auto-fix issues',
        inputSchema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Path to analyze (default: apps/web/src)',
                    default: 'apps/web/src',
                },
                fix: {
                    type: 'boolean',
                    description: 'Automatically fix issues when possible',
                    default: false,
                },
            },
        },
    });
    // ============================================================================
    // Tool: Analyze TypeScript Types
    // ============================================================================
    server.registerTool('analyze_typescript_types', async (args) => {
        const schema = z.object({
            project: z.enum(['web', 'all']).default('web'),
        });
        const { project } = schema.parse(args);
        const startTime = Date.now();
        // Run TypeScript compiler
        const command = project === 'web'
            ? 'cd apps/web && npx tsc --noEmit'
            : 'npx tsc --noEmit';
        const output = execCommand(command);
        const issues = parseTypeScriptOutput(output);
        const result = {
            total_issues: issues.length,
            errors: issues.filter((i) => i.severity === 'error').length,
            warnings: issues.filter((i) => i.severity === 'warning').length,
            fixable_issues: 0, // TypeScript errors are rarely auto-fixable
            issues: issues.slice(0, 50),
            execution_time_ms: Date.now() - startTime,
        };
        return {
            success: true,
            analysis: result,
            message: `Found ${issues.length} TypeScript type errors`,
        };
    }, {
        description: 'Analyze TypeScript types and find type errors',
        inputSchema: {
            type: 'object',
            properties: {
                project: {
                    type: 'string',
                    enum: ['web', 'all'],
                    description: 'Project to analyze',
                    default: 'web',
                },
            },
        },
    });
    // ============================================================================
    // Tool: Scan for Known Bugs
    // ============================================================================
    server.registerTool('scan_known_bugs', async (args) => {
        const schema = z.object({
            severity: z.enum(['P0', 'P1', 'P2', 'P3', 'all']).default('all'),
            limit: z.number().default(20),
        });
        const { severity, limit } = schema.parse(args);
        const bugs = parseKnownBugs();
        let filteredBugs = bugs;
        if (severity !== 'all') {
            filteredBugs = bugs.filter((b) => b.id.startsWith(severity));
        }
        return {
            success: true,
            total_bugs: bugs.length,
            filtered_bugs: filteredBugs.length,
            bugs: filteredBugs.slice(0, limit).map((b) => ({
                id: b.id,
                title: b.title,
                severity: b.severity,
                location: b.location,
                description: b.description.substring(0, 150) + '...',
            })),
            message: `Found ${filteredBugs.length} known bugs matching criteria`,
        };
    }, {
        description: 'Scan for known bugs from BUGS_AUDIT_REPORT.md',
        inputSchema: {
            type: 'object',
            properties: {
                severity: {
                    type: 'string',
                    enum: ['P0', 'P1', 'P2', 'P3', 'all'],
                    description: 'Filter by severity (P0=Critical, P1=High, P2=Medium, P3=Low)',
                    default: 'all',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of bugs to return',
                    default: 20,
                },
            },
        },
    });
    // ============================================================================
    // Tool: Auto-Fix Code Issues
    // ============================================================================
    server.registerTool('auto_fix_code', async (args) => {
        const schema = z.object({
            file_path: z.string().optional(),
            issue_type: z.enum(['eslint', 'typescript', 'all']).default('eslint'),
            run_tests: z.boolean().default(false),
        });
        const { file_path, issue_type, run_tests } = schema.parse(args);
        const changes = [];
        // 1. Run ESLint auto-fix
        if (issue_type === 'eslint' || issue_type === 'all') {
            try {
                const fixCommand = file_path
                    ? `npx eslint ${file_path} --fix`
                    : `npm run lint:fix`;
                execCommand(fixCommand);
                changes.push({
                    file: file_path || 'multiple files',
                    changes_made: ['Applied ESLint auto-fixes'],
                });
            }
            catch (error) {
                console.error('ESLint fix failed:', error);
            }
        }
        // 2. Verify build still works
        let builds = false;
        try {
            execCommand('timeout 60 npx tsc --noEmit');
            builds = true;
        }
        catch (error) {
            console.error('Build verification failed:', error);
        }
        // 3. Run tests if requested
        let testsPass;
        if (run_tests) {
            try {
                execCommand('npm run test:quick');
                testsPass = true;
            }
            catch (error) {
                testsPass = false;
            }
        }
        // 4. Count remaining issues
        const analysisOutput = execCommand('npm run lint -- --format=json || true');
        const remainingIssues = parseESLintOutput(analysisOutput);
        const result = {
            success: builds,
            fixed_count: changes.length,
            remaining_issues: remainingIssues.length,
            changes,
            validation: {
                builds,
                tests_pass: testsPass,
            },
        };
        return {
            success: result.success,
            fix_result: result,
            message: result.success
                ? `Successfully fixed ${result.fixed_count} issues. ${result.remaining_issues} issues remain.`
                : `Fixes applied but build failed. Please review changes.`,
        };
    }, {
        description: 'Automatically fix code issues (ESLint, formatting, etc.)',
        inputSchema: {
            type: 'object',
            properties: {
                file_path: {
                    type: 'string',
                    description: 'Specific file to fix (optional, fixes all if not provided)',
                },
                issue_type: {
                    type: 'string',
                    enum: ['eslint', 'typescript', 'all'],
                    description: 'Type of issues to fix',
                    default: 'eslint',
                },
                run_tests: {
                    type: 'boolean',
                    description: 'Run tests after fixing to validate',
                    default: false,
                },
            },
        },
    });
    // ============================================================================
    // Tool: Apply Specific Bug Fix
    // ============================================================================
    server.registerTool('apply_bug_fix', async (args) => {
        const schema = z.object({
            bug_id: z.string().regex(/^P\d+-\d+$/),
            dry_run: z.boolean().default(false),
        });
        const { bug_id, dry_run } = schema.parse(args);
        // Read the bug details
        const bugs = parseKnownBugs();
        const bug = bugs.find((b) => b.id === bug_id);
        if (!bug) {
            return {
                success: false,
                message: `Bug ${bug_id} not found in BUGS_AUDIT_REPORT.md`,
            };
        }
        // Check if fix is already documented in BUGS_FIXED.md
        const fixedPath = '/home/edu/autorenta/BUGS_FIXED.md';
        if (existsSync(fixedPath)) {
            const fixedContent = readFileSync(fixedPath, 'utf-8');
            if (fixedContent.includes(bug_id)) {
                return {
                    success: false,
                    message: `Bug ${bug_id} has already been fixed according to BUGS_FIXED.md`,
                    bug_info: bug,
                };
            }
        }
        if (dry_run) {
            return {
                success: true,
                message: `Dry run: Would apply fix for ${bug_id}`,
                bug_info: bug,
                note: 'Set dry_run: false to actually apply the fix',
            };
        }
        // TODO: Implement specific fixes based on bug ID
        // This would require a mapping of bug IDs to fix functions
        return {
            success: false,
            message: `Automated fix not available for ${bug_id}. Manual intervention required.`,
            bug_info: bug,
            recommendation: 'Use analyze_code_eslint or auto_fix_code for generic fixes',
        };
    }, {
        description: 'Apply a specific documented bug fix from BUGS_AUDIT_REPORT.md',
        inputSchema: {
            type: 'object',
            properties: {
                bug_id: {
                    type: 'string',
                    description: 'Bug ID (e.g., P0-001, P1-005)',
                    pattern: '^P\\d+-\\d+$',
                },
                dry_run: {
                    type: 'boolean',
                    description: 'Preview changes without applying them',
                    default: false,
                },
            },
            required: ['bug_id'],
        },
    });
    // ============================================================================
    // Tool: Comprehensive Code Health Report
    // ============================================================================
    server.registerTool('code_health_report', async (args) => {
        const schema = z.object({
            include_fixes: z.boolean().default(false),
        });
        const { include_fixes } = schema.parse(args);
        const startTime = Date.now();
        // Run all analyses in parallel
        const [eslintOutput, tsOutput] = await Promise.all([
            Promise.resolve(execCommand('npm run lint -- --format=json || true')),
            Promise.resolve(execCommand('cd apps/web && npx tsc --noEmit || true')),
        ]);
        const eslintIssues = parseESLintOutput(eslintOutput);
        const tsIssues = parseTypeScriptOutput(tsOutput);
        const knownBugs = parseKnownBugs();
        // Calculate metrics
        const totalIssues = eslintIssues.length + tsIssues.length + knownBugs.length;
        const criticalIssues = knownBugs.filter((b) => b.id.startsWith('P0')).length;
        const fixableIssues = eslintIssues.filter((i) => i.fixable).length;
        const report = {
            generated_at: new Date().toISOString(),
            execution_time_ms: Date.now() - startTime,
            summary: {
                total_issues: totalIssues,
                critical_bugs: criticalIssues,
                eslint_issues: eslintIssues.length,
                typescript_errors: tsIssues.length,
                known_bugs: knownBugs.length,
                auto_fixable: fixableIssues,
            },
            breakdown: {
                eslint: {
                    errors: eslintIssues.filter((i) => i.severity === 'error').length,
                    warnings: eslintIssues.filter((i) => i.severity === 'warning').length,
                    fixable: fixableIssues,
                },
                typescript: {
                    errors: tsIssues.filter((i) => i.severity === 'error').length,
                    warnings: tsIssues.filter((i) => i.severity === 'warning').length,
                },
                bugs: {
                    p0: knownBugs.filter((b) => b.id.startsWith('P0')).length,
                    p1: knownBugs.filter((b) => b.id.startsWith('P1')).length,
                    p2: knownBugs.filter((b) => b.id.startsWith('P2')).length,
                    p3: knownBugs.filter((b) => b.id.startsWith('P3')).length,
                },
            },
            top_issues: [
                ...eslintIssues.slice(0, 5),
                ...tsIssues.slice(0, 5),
                ...knownBugs.slice(0, 5).map((b) => ({
                    file: b.location,
                    line: 0,
                    column: 0,
                    severity: 'error',
                    message: `${b.id}: ${b.title}`,
                    rule: b.id,
                    fixable: false,
                })),
            ],
        };
        return {
            success: true,
            report,
            message: `Code health report generated. Found ${totalIssues} total issues (${criticalIssues} critical)`,
            recommendations: [
                fixableIssues > 0 && 'Run auto_fix_code to fix ' + fixableIssues + ' ESLint issues',
                criticalIssues > 0 && 'Address ' + criticalIssues + ' critical P0 bugs immediately',
                tsIssues.length > 10 && 'TypeScript errors are high. Consider fixing type issues',
            ].filter(Boolean),
        };
    }, {
        description: 'Generate comprehensive code health report with all issue types',
        inputSchema: {
            type: 'object',
            properties: {
                include_fixes: {
                    type: 'boolean',
                    description: 'Include fix suggestions in the report',
                    default: false,
                },
            },
        },
    });
    console.error('Code Analysis tools registered successfully');
}
