/**
 * Edge Brain Tier 7: Error Log Parser
 * 
 * Extracts actionable information from GitHub Actions error logs
 */

export interface ParsedError {
    file_path: string | null;
    line_number: number | null;
    error_message: string;
    error_type: 'lint' | 'compile' | 'test' | 'runtime';
    full_context: string;
}

/**
 * Extract file path and line number from error logs
 * 
 * Common patterns:
 * - ESLint: "/path/to/file.ts\n  123:45  error  message"
 * - TypeScript: "file.ts(123,45): error TS1234: message"
 * - Jest: "  at functionName (file.ts:123:45)"
 */
export function parseErrorLog(logContent: string): ParsedError {
    const result: ParsedError = {
        file_path: null,
        line_number: null,
        error_message: logContent.slice(0, 500), // First 500 chars as fallback
        error_type: classifyErrorType(logContent),
        full_context: logContent
    };

    // Try ESLint format: /path/to/file.ts\n  123:45  error
    const eslintMatch = logContent.match(/([^\n]+\.(?:ts|js|tsx|jsx))\s*\n\s*(\d+):\d+\s+(?:error|warning)\s+(.+)/i);
    if (eslintMatch) {
        result.file_path = eslintMatch[1].trim();
        result.line_number = parseInt(eslintMatch[2]);
        result.error_message = eslintMatch[3].trim();
        return result;
    }

    // Try TypeScript format: file.ts(123,45): error
    const tscMatch = logContent.match(/([^\s]+\.(?:ts|tsx))\((\d+),\d+\):\s+error\s+TS\d+:\s+(.+)/);
    if (tscMatch) {
        result.file_path = tscMatch[1];
        result.line_number = parseInt(tscMatch[2]);
        result.error_message = tscMatch[3].trim();
        return result;
    }

    // Try Jest/Stack trace format: at ... (file.ts:123:45)
    const jestMatch = logContent.match(/at\s+.+?\(([^\)]+\.(?:ts|js|tsx|jsx)):(\d+):\d+\)/);
    if (jestMatch) {
        result.file_path = jestMatch[1];
        result.line_number = parseInt(jestMatch[2]);
        return result;
    }

    // Try generic file:line format
    const genericMatch = logContent.match(/([^\s]+\.(?:ts|js|tsx|jsx|sh)):(\d+)/);
    if (genericMatch) {
        result.file_path = genericMatch[1];
        result.line_number = parseInt(genericMatch[2]);
        return result;
    }

    // Extract just file path if no line number found
    const fileMatch = logContent.match(/([a-zA-Z0-9_\-/.]+\.(?:ts|js|tsx|jsx|sh|json))/);
    if (fileMatch) {
        result.file_path = fileMatch[1];
    }

    return result;
}

/**
 * Classify error type from log content
 */
function classifyErrorType(logContent: string): 'lint' | 'compile' | 'test' | 'runtime' {
    const lowerLog = logContent.toLowerCase();

    if (lowerLog.includes('eslint') || lowerLog.includes('lint') || lowerLog.includes('@typescript-eslint') || lowerLog.includes('@angular-eslint')) {
        return 'lint';
    }
    if (lowerLog.includes('typescript') || lowerLog.includes('tsc') || lowerLog.includes('ts(') || lowerLog.includes('compilation')) {
        return 'compile';
    }
    if (lowerLog.includes('test') || lowerLog.includes('spec') || lowerLog.includes('jest') || lowerLog.includes('vitest')) {
        return 'test';
    }

    return 'runtime';
}

/**
 * Extract the most relevant snippet from full log
 */
export function extractRelevantSnippet(logContent: string, maxLength: number = 4000): string {
    // Find error markers
    const errorMarkers = [
        'error:',
        'Error:',
        'ERROR:',
        '✖',
        '❌',
        'FAIL',
        'Failed',
        'Exception'
    ];

    let earliestIndex = logContent.length;

    for (const marker of errorMarkers) {
        const index = logContent.indexOf(marker);
        if (index !== -1 && index < earliestIndex) {
            earliestIndex = index;
        }
    }

    // Extract from first error marker
    if (earliestIndex < logContent.length) {
        const startIndex = Math.max(0, earliestIndex - 500); // Include 500 chars before error
        return logContent.slice(startIndex, startIndex + maxLength);
    }

    // Fallback: return last N characters (most recent output)
    return logContent.slice(-maxLength);
}
