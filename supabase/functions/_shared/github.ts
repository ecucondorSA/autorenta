export interface GitHubFile {
    path: string;
    content: string; // Base64 encoded if reading, plain string if writing
}

export class GitHubClient {
    private baseUrl = 'https://api.github.com';
    private headers: HeadersInit;

    constructor(private token: string, private owner: string, private repo: string) {
        this.headers = {
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
            'User-Agent': 'AutoRenta-AI-Doctor',
        };
    }

    async getWorkflowRunLogs(runId: number): Promise<string> {
        const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/actions/runs/${runId}/logs`;
        console.log(`Fetching logs from: ${url}`);

        // Logs endpoint redirects to a zip file usually, but API might handle it.
        // Actually, getting logs via API is complex (it returns a zip).
        // Simplified MVP: We'll list failed jobs and get their steps' logs if possible,
        // or just rely on the API returning the zip location and text scraping.
        // For Tier 6 MVP, let's assume we can fetch the 'jobs' listing and see the 'steps' text 
        // if we had a specific job ID.
        // BUT, `logs` returns a zip. 

        // Better approach for text: Get the jobs, find the failed one, get the log URL for that job? 
        // GitHub API logic: 
        // 1. List jobs for run: GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs
        // 2. For failed job: GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs

        return "LOG FETCHING IMPLEMENTATION PENDING (REQUIRES ZIP HANDLING OR JOB ITERATION)";
    }

    async listJobs(runId: number) {
        const resp = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/actions/runs/${runId}/jobs`, {
            headers: this.headers
        });
        return resp.json();
    }

    async getJobLog(jobId: number): Promise<string> {
        const resp = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/actions/jobs/${jobId}/logs`, {
            headers: this.headers
        });
        if (!resp.ok) throw new Error(`Failed to fetch logs: ${resp.statusText}`);
        return await resp.text();
    }

    async getContent(path: string, ref?: string) {
        const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}${ref ? `?ref=${ref}` : ''}`;
        const resp = await fetch(url, { headers: this.headers });
        if (!resp.ok) return null;
        return resp.json();
    }

    async updateFile(path: string, content: string, message: string, sha: string, branch: string) {
        const resp = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`, {
            method: 'PUT',
            headers: this.headers,
            body: JSON.stringify({
                message,
                content: btoa(content), // Base64 encode
                sha,
                branch
            })
        });
        return resp.json();
    }

    async createBranch(baseBranch: string, newBranch: string) {
        // 1. Get SHA of base branch
        const baseResp = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/git/ref/heads/${baseBranch}`, {
            headers: this.headers
        });
        const baseJson = await baseResp.json();
        const sha = baseJson.object.sha;

        // 2. Create ref
        const createResp = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/git/refs`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                ref: `refs/heads/${newBranch}`,
                sha: sha
            })
        });
        return createResp.json();
    }

    async createPR(title: string, body: string, head: string, base: string) {
        const resp = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/pulls`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ title, body, head, base })
        });
        return resp.json();
    }
}
