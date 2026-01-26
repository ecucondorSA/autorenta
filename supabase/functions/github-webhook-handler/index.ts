import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, callGemini } from '../_shared/gemini.ts';
import { GitHubClient } from '../_shared/github.ts';

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const payload = await req.json();

        // We only care about workflow_run completed failure
        if (payload.action !== 'completed' || payload.workflow_run?.conclusion !== 'failure') {
            return new Response(JSON.stringify({ message: 'Ignored: Not a failed workflow run completion.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        const runId = payload.workflow_run.id;
        const repoName = payload.repository.name;
        const ownerName = payload.repository.owner.login;
        const branch = payload.workflow_run.head_branch;

        console.log(`🚑 Analyzing failed run ${runId} on ${ownerName}/${repoName} (${branch})`);

        // Environment Variables
        const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN') || Deno.env.get('GH_TOKEN');
        const GOOGLE_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY');

        if (!GITHUB_TOKEN || !GOOGLE_API_KEY) {
            throw new Error('Missing GITHUB_TOKEN or GOOGLE_API_KEY config.');
        }

        const github = new GitHubClient(GITHUB_TOKEN, ownerName, repoName);

        // 1. Get Log of failed job
        const jobsData = await github.listJobs(runId);
        const failedJob = jobsData.jobs?.find((j: any) => j.conclusion === 'failure');

        if (!failedJob) {
            return new Response(JSON.stringify({ message: 'No failed job found in listing.' }), { headers: corsHeaders });
        }

        console.log(`Found failed job: ${failedJob.name} (${failedJob.id})`);
        const logs = await github.getJobLog(failedJob.id);

        // Truncate logs if too huge for context
        const snippet = logs.slice(-8000); // Last 8000 chars

        // 2. Ask Gemini for a Fix (with improved conservative prompt)
        const systemPrompt = `You are a CI/CD Repair Agent (Tier 6).
        Analyze the provided GitHub Actions Log snippet.
        
        GOAL: Propose a MINIMAL, SURGICAL fix for the error.
        
        CRITICAL CONSTRAINTS:
        - Make the SMALLEST possible change to fix the error
        - Preserve ALL existing functionality
        - Do NOT delete or simplify working code
        - Do NOT refactor unrelated code
        - If the error is in imports, ONLY fix the imports
        - If the error is a lint warning, ONLY fix that specific line
        
        RESPONSE FORMAT (JSON):
        {
          "cause": "Brief explanation of root cause",
          "fix_plan": "Description of minimal fix",
          "target_file_path": "path/to/file.ts",
          "fixed_file_content": "FULL NEW CONTENT OF THE FILE (with minimal changes applied)"
        }
        
        RULES:
        1. If the error is NOT fixable by code change (e.g. missing env var, server down), set "target_file_path" to null.
        2. Return VALID JSON only.
        3. When providing fixed_file_content, make ONLY the changes needed to fix the error.`;

        const analysisRaw = await callGemini(
            "Analyze this failure log and provide a MINIMAL, SURGICAL fix.",
            snippet,
            systemPrompt,
            GOOGLE_API_KEY
        );

        console.log('Gemini Analysis:', analysisRaw);

        // Parse the JSON response/fix
        const cleanJson = analysisRaw.replace(/```json/g, '').replace(/```/g, '').trim();
        let fixData;
        try {
            fixData = JSON.parse(cleanJson);
        } catch (e) {
            console.error('Failed to parse Gemini JSON:', e);
            return new Response(JSON.stringify({ message: 'Analysis failed to parse' }), { headers: corsHeaders });
        }

        if (fixData.target_file_path) {
            console.log(`🚑 Attempting auto-fix on ${fixData.target_file_path}`);

            // 3. Create Branch
            const fixBranch = `fix/ai-auto-repair-${Date.now()}`;
            try {
                // Determine base branch from payload (the one that failed)
                const baseBranch = payload.workflow_run.head_branch;
                await github.createBranch(baseBranch, fixBranch);

                // 4. Get current SHA and content of file to update
                const currentFile = await github.getContent(fixData.target_file_path, fixBranch);

                if (currentFile) {
                    // 5. SAFETY VALIDATION: Check if fix is too aggressive
                    const originalContent = atob(currentFile.content); // Decode base64
                    const originalLines = originalContent.split('\n').length;
                    const fixedLines = fixData.fixed_file_content.split('\n').length;
                    const deletionPercentage = ((originalLines - fixedLines) / originalLines) * 100;

                    console.log(`📊 Line count: ${originalLines} → ${fixedLines} (${deletionPercentage.toFixed(1)}% deletion)`);

                    // Reject if deleting more than 10% of the file
                    if (deletionPercentage > 10) {
                        console.error(`❌ REJECTED: Fix would delete ${deletionPercentage.toFixed(1)}% of the file (threshold: 10%)`);
                        return new Response(JSON.stringify({
                            message: 'Fix rejected: Too aggressive',
                            reason: `Would delete ${deletionPercentage.toFixed(1)}% of lines (${originalLines} → ${fixedLines})`,
                            analysis: fixData
                        }), { headers: corsHeaders });
                    }

                    // Additional validation: reject if adding more than 50% new lines (might be hallucination)
                    const additionPercentage = ((fixedLines - originalLines) / originalLines) * 100;
                    if (additionPercentage > 50) {
                        console.error(`❌ REJECTED: Fix would add ${additionPercentage.toFixed(1)}% new lines (threshold: 50%)`);
                        return new Response(JSON.stringify({
                            message: 'Fix rejected: Too many additions',
                            reason: `Would add ${additionPercentage.toFixed(1)}% new lines (${originalLines} → ${fixedLines})`,
                            analysis: fixData
                        }), { headers: corsHeaders });
                    }

                    console.log(`✅ Validation passed: Changes are within safe thresholds`);

                    // 6. Apply Fix
                    await github.updateFile(
                        fixData.target_file_path,
                        fixData.fixed_file_content,
                        `fix(ci): auto-repair by Tier 6 Brain 🧠`,
                        currentFile.sha,
                        fixBranch
                    );

                    // 7. Create PR
                    const pr = await github.createPR(
                        `🚑 Fix: ${fixData.cause}`,
                        `Auto-generated fix by AutoRenta Tier 6 Brain.\n\n**Analysis**: ${fixData.cause}\n**Plan**: ${fixData.fix_plan}\n\n**Safety Validation**: ✅ Passed\n- Original lines: ${originalLines}\n- Fixed lines: ${fixedLines}\n- Change: ${deletionPercentage > 0 ? '-' : '+'}${Math.abs(deletionPercentage).toFixed(1)}%`,
                        fixBranch,
                        baseBranch
                    );

                    console.log(`✅ PR Created: ${pr.html_url}`);

                    return new Response(JSON.stringify({
                        message: 'Fix PR Created',
                        prUrl: pr.html_url,
                        analysis: fixData,
                        validation: {
                            originalLines,
                            fixedLines,
                            changePercentage: deletionPercentage
                        }
                    }), { headers: corsHeaders });
                }
            } catch (err) {
                console.error('Failed to apply fix:', err);
                // Fallthrough to return analysis only
            }
        }

        return new Response(JSON.stringify({
            message: 'Analysis Complete (No Fix Applied)',
            analysis: cleanJson,
            jobId: failedJob.id
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
