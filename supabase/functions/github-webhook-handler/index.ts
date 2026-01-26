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

        // 2. Ask Gemini for a Fix
        const systemPrompt = `You are a CI/CD Repair Agent (Tier 6).
        Analyze the provided GitHub Actions Log snippet.
        
        GOAL: Correct the error by modifying the code.
        
        RESPONSE FORMAT (JSON):
        {
          "cause": "Explanation of error",
          "fix_plan": "Description of fix",
          "target_file_path": "path/to/file.ts",
          "fixed_file_content": "FULL NEW CONTENT OF THE FILE"
        }
        
        RULES:
        1. If the error is NOT fixable by code change (e.g. server down), set "target_file_path" to null.
        2. Return VALID JSON only.`;

        const analysisRaw = await callGemini(
            "Analyze this failure log and provide a fix.",
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

                // 4. Get current SHA of file to update
                // Note: We need to handle if file doesn't exist (creation) vs update. For now assume update.
                const currentFile = await github.getContent(fixData.target_file_path, fixBranch);

                if (currentFile) {
                    // 5. Apply Fix
                    await github.updateFile(
                        fixData.target_file_path,
                        fixData.fixed_file_content,
                        `fix(ci): auto-repair by Tier 6 Brain 🧠`,
                        currentFile.sha,
                        fixBranch
                    );

                    // 6. Create PR
                    const pr = await github.createPR(
                        `🚑 Fix: ${fixData.cause}`,
                        `Auto-generated fix by AutoRenta Tier 6 Brain.\n\n**Analysis**: ${fixData.cause}\n**Plan**: ${fixData.fix_plan}`,
                        fixBranch,
                        baseBranch
                    );

                    console.log(`✅ PR Created: ${pr.html_url}`);

                    return new Response(JSON.stringify({
                        message: 'Fix PR Created',
                        prUrl: pr.html_url,
                        analysis: fixData
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
