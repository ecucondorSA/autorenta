import type { GeminiClient } from '../gemini-client.js';
export declare const codeReviewToolSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            file_path: {
                type: string;
                description: string;
            };
            context: {
                type: string;
                description: string;
            };
            focus: {
                type: string;
                enum: string[];
                description: string;
            };
        };
        required: string[];
    };
};
export declare function registerCodeReviewTool(gemini: GeminiClient, handlers: Map<string, (args: any) => Promise<any>>): void;
