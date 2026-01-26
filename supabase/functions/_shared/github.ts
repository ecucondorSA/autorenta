export interface GitHubFile {
    path: string;
    content: string; // Base64 encoded if reading, plain string if writing
    sha?: string;
}

export interface Patch {
    file: string;
    line_number: number;
    operation: 'delete' | 'replace' | 'insert_after';
    original_line?: string;
    new_line?: string;
    reason?: string;
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

    async getContent(path: string, ref?: string): Promise<any> {
        const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}${ref ? `?ref=${ref}` : ''}`;
        const resp = await fetch(url, { headers: this.headers });
        if (!resp.ok) return null;
        return resp.json();
    }

    /**
     * Get decoded file content for RAG context
     */
    async getFileContentDecoded(path: string, ref?: string): Promise<string | null> {
        const fileData = await this.getContent(path, ref);
        if (!fileData || !fileData.content) return null;

        try {
            // GitHub returns base64 encoded content
            return atob(fileData.content.replace(/\n/g, ''));
        } catch (e) {
            console.error('Failed to decode file content:', e);
            return null;
        }
    }

    /**
     * Apply patches to file content
     */
    applyPatches(originalContent: string, patches: Patch[]): string {
        const lines = originalContent.split('\n');

        // Sort patches by line number (descending) to avoid index shifts
        const sortedPatches = [...patches].sort((a, b) => b.line_number - a.line_number);

        for (const patch of sortedPatches) {
            const lineIndex = patch.line_number - 1; // Convert to 0-based index

            if (lineIndex < 0 || lineIndex >= lines.length) {
                console.warn(`Patch line ${patch.line_number} out of bounds (file has ${lines.length} lines)`);
                continue;
            }

            switch (patch.operation) {
                case 'delete':
                    lines.splice(lineIndex, 1);
                    break;

                case 'replace':
                    // Validate original line matches (safety check)
                    if (patch.original_line && lines[lineIndex].trim() !== patch.original_line.trim()) {
                        console.warn(`Line ${patch.line_number} mismatch. Expected: "${patch.original_line}", Found: "${lines[lineIndex]}"`);
                        // Still apply (Gemini might have slight whitespace differences)
                    }
                    if (patch.new_line) {
                        lines[lineIndex] = patch.new_line;
                    }
                    break;

                case 'insert_after':
                    if (patch.new_line) {
                        lines.splice(lineIndex + 1, 0, patch.new_line);
                    }
                    break;
            }
        }

        return lines.join('\n');
    }

    /**
     * Validate that patches would reduce file size within acceptable limits
     */
    validatePatchSafety(originalContent: string, patches: Patch[]): { valid: boolean; reason?: string } {
        const originalLines = originalContent.split('\n').length;

        // Count deletions
        const deletions = patches.filter(p => p.operation === 'delete').length;
        const deletionPercentage = (deletions / originalLines) * 100;

        if (deletionPercentage > 10) {
            return {
                valid: false,
                reason: `Would delete ${deletionPercentage.toFixed(1)}% of lines (${deletions}/${originalLines}). Threshold: 10%`
            };
        }

        // Count insertions
        const insertions = patches.filter(p => p.operation === 'insert_after').length;
        const insertionPercentage = (insertions / originalLines) * 100;

        if (insertionPercentage > 50) {
            return {
                valid: false,
                reason: `Would insert ${insertionPercentage.toFixed(1)}% new lines (${insertions} into ${originalLines}). Threshold: 50%`
            };
        }

        return { valid: true };
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
