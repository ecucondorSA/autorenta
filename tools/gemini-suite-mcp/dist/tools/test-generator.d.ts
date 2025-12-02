import type { GeminiClient } from '../gemini-client.js';
export declare const testGeneratorToolSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            file_path: {
                type: string;
                description: string;
            };
            test_type: {
                type: string;
                enum: string[];
                description: string;
            };
            framework: {
                type: string;
                enum: string[];
                description: string;
            };
        };
        required: string[];
    };
};
export declare function registerTestGeneratorTool(gemini: GeminiClient, handlers: Map<string, (args: any) => Promise<any>>): void;
