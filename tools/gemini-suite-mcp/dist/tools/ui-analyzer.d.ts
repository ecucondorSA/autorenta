import type { GeminiClient } from '../gemini-client.js';
export declare const uiAnalyzerToolSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            screenshot_base64: {
                type: string;
                description: string;
            };
            screenshot_path: {
                type: string;
                description: string;
            };
            url: {
                type: string;
                description: string;
            };
            analysis_type: {
                type: string;
                enum: string[];
                description: string;
            };
        };
    };
};
export declare function registerUIAnalyzerTool(gemini: GeminiClient, handlers: Map<string, (args: any) => Promise<any>>): void;
