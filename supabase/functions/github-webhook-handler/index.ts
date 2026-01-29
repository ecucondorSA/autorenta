import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/gemini.ts';
import { callGemini } from '../_shared/gemini.ts';
import { GitHubClient, type Patch } from '../_shared/github.ts';
import { parseErrorLog, extractRelevantSnippet } from '../_shared/error-parser.ts';
import { ALL_STRATEGIES, selectStrategyForError, type FixStrategy } from '../_shared/strategies.ts';
import { EdgeBrainMemory, type FixAttempt } from '../_shared/memory.ts';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const payload = await req.json();
        console.log('[Edge Brain Tier 7] Webhook received:', payload.action, payload.workflow_run?.event);

        // Only handle completed workflow runs that failed
        if (payload.action !== 'completed' || payload.workflow_run?.conclusion !== 'failure') {
            return new Response(JSON.stringify({ message: 'Skipping: not a failed workflow run' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const runId = payload.workflow_run.id;
        const baseBranch = payload.workflow_run.head_branch;

        console.log(`[Edge Brain] 🚨 Detected failure in run ${runId} on branch ${baseBranch}`);

        // Get GitHub credentials from environment
        const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
        const GITHUB_OWNER = Deno.env.get('GITHUB_OWNER') || 'ecucondorSA';
        const GITHUB_REPO = Deno.env.get('GITHUB_REPO') || 'autorenta';
        const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        if (!GITHUB_TOKEN || !GOOGLE_API_KEY) {
            console.error('[Edge Brain] Missing credentials');
            return new Response(JSON.stringify({ error: 'Missing credentials' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            });
        }

        const github = new GitHubClient(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO);
        const memory = new EdgeBrainMemory(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const startTime = Date.now();
        let attemptRecord: Partial<FixAttempt> = {
            workflow_run_id: runId,
            base_branch: baseBranch,
            pr_created: false,
            safety_check_passed: false
        };

        // ============================================================
        // RATE LIMITING CHECK (NEW)
        // ============================================================
        console.log('[Edge Brain] 🚦 Checking rate limits...');
        const rateLimit = await memory.canCreatePR();
        if (!rateLimit.allowed) {
            console.warn(`[Edge Brain] ⏳ Rate limited: ${rateLimit.reason}`);
            return new Response(JSON.stringify({
                message: 'Rate limited',
                reason: rateLimit.reason,
                retry_after_minutes: rateLimit.waitMinutes
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 429,
            });
        }

        // ============================================================
        // CHECK OPEN PR COUNT (NEW)
        // ============================================================
        const MAX_OPEN_PRS = 10;
        const openPRCount = await github.countOpenEdgeBrainPRs();
        if (openPRCount >= MAX_OPEN_PRS) {
            console.warn(`[Edge Brain] 🛑 Too many open PRs: ${openPRCount}/${MAX_OPEN_PRS}`);
            return new Response(JSON.stringify({
                message: 'Too many open PRs',
                open_prs: openPRCount,
                max_allowed: MAX_OPEN_PRS,
                action: 'Please review and merge/close existing PRs first'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 429,
            });
        }

        // 1. Get logs from failed job
        console.log('[Edge Brain] 📥 Fetching job logs...');
        const jobsData = await github.listJobs(runId);
        const failedJob = jobsData.jobs?.find((j: any) => j.conclusion === 'failure');

        if (!failedJob) {
            console.warn('[Edge Brain] No failed job found in run');
            return new Response(JSON.stringify({ message: 'No failed job found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const logs = await github.getJobLog(failedJob.id);
        const relevantSnippet = extractRelevantSnippet(logs);

        console.log(`[Edge Brain] 📜 Extracted ${relevantSnippet.length} chars from logs`);

        // 2. Parse error to extract file path and context
        const parsedError = parseErrorLog(relevantSnippet);
        console.log(`[Edge Brain] 🔍 Parsed error:`, {
            file: parsedError.file_path,
            line: parsedError.line_number,
            type: parsedError.error_type
        });

        if (!parsedError.file_path) {
            console.warn('[Edge Brain] Could not extract file path from logs');
            return new Response(JSON.stringify({
                message: 'Could not identify target file',
                logs_snippet: relevantSnippet.slice(0, 500)
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ============================================================
        // FILE COOLDOWN CHECK (NEW)
        // ============================================================
        console.log(`[Edge Brain] ⏱️ Checking cooldown for ${parsedError.file_path}...`);
        const cooldown = await memory.hasFileCooldown(parsedError.file_path);
        if (cooldown.onCooldown) {
            console.warn(`[Edge Brain] ⏳ File on cooldown: ${cooldown.minutesRemaining} minutes remaining`);
            return new Response(JSON.stringify({
                message: 'File on cooldown',
                file: parsedError.file_path,
                minutes_remaining: cooldown.minutesRemaining,
                reason: 'A PR was recently created for this file. Wait before creating another.'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 429,
            });
        }

        // ============================================================
        // PR DEDUPLICATION CHECK (NEW)
        // ============================================================
        console.log(`[Edge Brain] 🔍 Checking for existing PR for ${parsedError.file_path}...`);
        const existingPR = await github.hasOpenPRForFile(parsedError.file_path);
        if (existingPR.hasOpenPR) {
            console.warn(`[Edge Brain] 📋 PR already exists: #${existingPR.existingPR?.number}`);
            return new Response(JSON.stringify({
                message: 'PR already exists for this file',
                file: parsedError.file_path,
                existing_pr: existingPR.existingPR,
                action: 'Review the existing PR instead of creating a duplicate'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 3. Get file content for RAG context
        console.log(`[Edge Brain] 📄 Fetching file content: ${parsedError.file_path}`);
        const fileContent = await github.getFileContentDecoded(parsedError.file_path, baseBranch);

        if (!fileContent) {
            console.warn(`[Edge Brain] Could not fetch file content for ${parsedError.file_path}`);
            return new Response(JSON.stringify({
                message: 'Could not fetch file content',
                file: parsedError.file_path
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`[Edge Brain] ✅ Got file content (${fileContent.split('\n').length} lines)`);

        // Update attempt record with error context
        attemptRecord = {
            ...attemptRecord,
            error_type: parsedError.error_type,
            error_message: parsedError.error_message,
            file_path: parsedError.file_path
        };

        // 4. Multi-Strategy Attempt (with Learning)
        const strategies = await getStrategiesForError(parsedError.error_type, memory);
        let fixResponse: any = null;
        let usedStrategy: FixStrategy | null = null;

        for (const strategy of strategies) {
            console.log(`[Edge Brain] 🎯 Trying strategy: ${strategy.name}`);

            try {
                const userPrompt = strategy.userPromptTemplate
                    .replace('{file_content}', fileContent)
                    .replace('{file_path}', parsedError.file_path)
                    .replace('{error_log}', relevantSnippet);

                const rawResponse = await callGemini(
                    userPrompt,
                    '', // Context is in user prompt now
                    strategy.systemPrompt,
                    GOOGLE_API_KEY,
                    strategy.model,
                    strategy.temperature
                );

                console.log(`[Edge Brain] 🤖 ${strategy.name} response:`, rawResponse.slice(0, 200));

                // Parse JSON response
                const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                fixResponse = JSON.parse(cleanJson);

                if (fixResponse.patches && fixResponse.patches.length > 0) {
                    usedStrategy = strategy;
                    console.log(`[Edge Brain] ✅ Strategy ${strategy.name} provided ${fixResponse.patches.length} patches`);

                    // Update attempt record with strategy info
                    attemptRecord = {
                        ...attemptRecord,
                        strategy_used: strategy.name,
                        model_used: strategy.model,
                        temperature: strategy.temperature,
                        patches_count: fixResponse.patches.length,
                        fix_confidence: fixResponse.confidence || null
                    };

                    break;
                }
            } catch (e) {
                console.warn(`[Edge Brain] Strategy ${strategy.name} failed:`, e instanceof Error ? e.message : e);
                continue;
            }
        }

        if (!fixResponse || !fixResponse.patches || fixResponse.patches.length === 0) {
            console.warn('[Edge Brain] All strategies failed or returned no patches');
            return new Response(JSON.stringify({
                message: 'Could not generate fix',
                error_analysis: fixResponse?.analysis || 'No analysis available'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 5. Validate Patch Safety
        console.log('[Edge Brain] 🛡️ Validating patch safety...');
        const safetyCheck = github.validatePatchSafety(fileContent, fixResponse.patches);

        if (!safetyCheck.valid) {
            console.error(`[Edge Brain] ❌ REJECTED: ${safetyCheck.reason}`);

            // Log rejected attempt
            attemptRecord.safety_check_passed = false;
            attemptRecord.safety_rejection_reason = safetyCheck.reason;
            attemptRecord.execution_time_ms = Date.now() - startTime;
            await memory.logAttempt(attemptRecord as FixAttempt);

            return new Response(JSON.stringify({
                message: 'Fix rejected: Too aggressive',
                reason: safetyCheck.reason,
                proposed_patches: fixResponse.patches,
                strategy_used: usedStrategy?.name
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log('[Edge Brain] ✅ Patch safety validated');

        // 6. Apply patches
        console.log('[Edge Brain] 🔧 Applying patches...');
        const patchedContent = github.applyPatches(fileContent, fixResponse.patches);

        const originalLines = fileContent.split('\n').length;
        const patchedLines = patchedContent.split('\n').length;
        const changePercent = ((patchedLines - originalLines) / originalLines * 100).toFixed(1);

        console.log(`[Edge Brain] 📊 Changes: ${originalLines} → ${patchedLines} lines (${changePercent}%)`);

        // 7. Create fix branch and PR
        const fixBranch = `fix/ai-auto-repair-${Date.now()}`;
        console.log(`[Edge Brain] 🌿 Creating branch: ${fixBranch}`);

        try {
            await github.createBranch(baseBranch, fixBranch);

            const currentFile = await github.getContent(parsedError.file_path, fixBranch);

            if (currentFile) {
                await github.updateFile(
                    parsedError.file_path,
                    patchedContent,
                    `fix(ci): ${fixResponse.analysis || 'auto-repair by Tier 7 Brain'}`,
                    currentFile.sha,
                    fixBranch
                );

                const prBody = `🧠 **Auto-generated fix by Edge Brain Tier 7**

**Strategy Used:** \`${usedStrategy?.name}\` (${usedStrategy?.model})

**Analysis:** ${fixResponse.analysis}

**Changes Applied:**
${fixResponse.patches.map((p: Patch, i: number) =>
                    `${i + 1}. \`${parsedError.file_path}:${p.line_number}\` - **${p.operation}**${p.reason ? ` - ${p.reason}` : ''}`
                ).join('\n')}

**Safety Validation:** ✅ Passed
- Original lines: ${originalLines}
- Patched lines: ${patchedLines}
- Change: ${changePercent}% (threshold: ±10%)

**Confidence:** ${fixResponse.confidence ? `${(fixResponse.confidence * 100).toFixed(0)}%` : 'N/A'}
`;

                // ENHANCED: Shorter, cleaner PR titles
                const shortFileName = parsedError.file_path.split('/').pop() || 'file';
                const shortAnalysis = (fixResponse.analysis || parsedError.error_type).slice(0, 50);
                const prTitle = `fix(${parsedError.error_type}): ${shortFileName} - ${shortAnalysis}`;

                const pr = await github.createPR(
                    prTitle,
                    prBody,
                    fixBranch,
                    baseBranch
                );

                console.log(`[Edge Brain] ✅ PR Created: ${pr.html_url}`);

                // Log successful attempt
                attemptRecord.pr_number = pr.number;
                attemptRecord.pr_url = pr.html_url;
                attemptRecord.pr_created = true;
                attemptRecord.safety_check_passed = true;
                attemptRecord.lines_changed = Math.abs(patchedLines - originalLines);
                attemptRecord.change_percentage = parseFloat(changePercent);
                attemptRecord.fix_branch = fixBranch;
                attemptRecord.execution_time_ms = Date.now() - startTime;
                attemptRecord.job_id = failedJob.id;
                await memory.logAttempt(attemptRecord as FixAttempt);

                return new Response(JSON.stringify({
                    message: 'Surgical fix PR created',
                    pr_url: pr.html_url,
                    strategy: usedStrategy?.name,
                    patches_applied: fixResponse.patches.length,
                    file: parsedError.file_path,
                    change_percentage: parseFloat(changePercent)
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        } catch (err) {
            console.error('[Edge Brain] Failed to create PR:', err);
            return new Response(JSON.stringify({
                message: 'Failed to create PR',
                error: err instanceof Error ? err.message : String(err)
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            });
        }

        return new Response(JSON.stringify({
            message: 'Processing completed but no PR created',
            details: 'Unexpected flow state'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('[Edge Brain] Fatal error:', error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : String(error)
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});

/**
 * Get ordered list of strategies to try for a given error type
 * Uses historical learning data if available
 */
async function getStrategiesForError(
    errorType: 'lint' | 'compile' | 'test' | 'runtime',
    memory: EdgeBrainMemory
): Promise<FixStrategy[]> {
    // Try to get best strategy from historical data
    const bestStrategyName = await memory.getBestStrategy(errorType);

    if (bestStrategyName) {
        console.log(`[Edge Brain] 🧠 Learning: Using historically best strategy "${bestStrategyName}" for ${errorType} errors`);

        const bestStrategy = ALL_STRATEGIES.find(s => s.name === bestStrategyName);
        if (bestStrategy) {
            // Return best first, then others as fallback
            return [
                bestStrategy,
                ...ALL_STRATEGIES.filter(s => s.name !== bestStrategyName)
            ];
        }
    }

    // Fallback to default heuristic-based selection
    console.log(`[Edge Brain] 📊 No historical data, using default strategy for ${errorType}`);
    const primary = selectStrategyForError(errorType);

    return [
        primary,
        ...ALL_STRATEGIES.filter(s => s.name !== primary.name)
    ];
}
