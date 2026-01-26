import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/gemini.ts';
import { callGemini } from '../_shared/gemini.ts';
import { GitHubClient, type Patch } from '../_shared/github.ts';
import { parseErrorLog, extractRelevantSnippet } from '../_shared/error-parser.ts';
import { ALL_STRATEGIES, selectStrategyForError, type FixStrategy } from '../_shared/strategies.ts';

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

        if (!GITHUB_TOKEN || !GOOGLE_API_KEY) {
            console.error('[Edge Brain] Missing credentials');
            return new Response(JSON.stringify({ error: 'Missing credentials' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            });
        }

        const github = new GitHubClient(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO);

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

        // 4. Multi-Strategy Attempt
        const strategies = getStrategiesForError(parsedError.error_type);
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

                const pr = await github.createPR(
                    `🚑 Fix (Tier 7): ${fixResponse.analysis || parsedError.error_message.slice(0, 100)}`,
                    prBody,
                    fixBranch,
                    baseBranch
                );

                console.log(`[Edge Brain] ✅ PR Created: ${pr.html_url}`);

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
 */
function getStrategiesForError(errorType: 'lint' | 'compile' | 'test' | 'runtime'): FixStrategy[] {
    const primary = selectStrategyForError(errorType);

    // Return ordered list: primary first, then others as fallback
    return [
        primary,
        ...ALL_STRATEGIES.filter(s => s.name !== primary.name)
    ];
}
