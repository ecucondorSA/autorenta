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
        const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

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

        // 2. Ask Gemini
        const systemPrompt = `You are a CI/CD Repair Agent (Tier 6).
    Analyze the provided GitHub Actions Log snippet.
    1. Identify the root cause of the error.
    2. Propose a specific fix explanation in Spanish.
    3. Return a JSON Summary: { "cause": "...", "fix_plan": "...", "is_infrastructure_error": boolean }`;

        const analysisRaw = await callGemini(
            "Analyze this failure log.",
            snippet,
            systemPrompt,
            GOOGLE_API_KEY
        );

        console.log('Gemini Analysis:', analysisRaw);

        // Tier 6 MVP: Just logging the analysis for now.
        // Advanced: Create PR based on "fix_plan" if is_infrastructure_error allows.

        return new Response(JSON.stringify({
            message: 'Analysis Complete',
            analysis: analysisRaw,
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
