import type { GeminiClient } from '../gemini-client.js';
export declare const codeCompareToolSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            original_path: {
                type: string;
                description: string;
            };
            modified_path: {
                type: string;
                description: string;
            };
            original_code: {
                type: string;
                description: string;
            };
            modified_code: {
                type: string;
                description: string;
            };
        };
    };
};
export declare function registerCodeCompareTool(gemini: GeminiClient, handlers: Map<string, (args: any) => Promise<any>>): void;
