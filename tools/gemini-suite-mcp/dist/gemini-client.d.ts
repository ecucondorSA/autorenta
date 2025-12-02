export declare class GeminiClient {
    private client;
    private modelPro;
    private modelFlash;
    constructor();
    /**
     * Generate content using Gemini Pro (for complex analysis)
     */
    generatePro(prompt: string, systemPrompt?: string): Promise<string>;
    /**
     * Generate content using Gemini Flash (for quick tasks)
     */
    generateFlash(prompt: string, systemPrompt?: string): Promise<string>;
    /**
     * Analyze an image with Gemini Vision
     */
    analyzeImage(imageBase64: string, prompt: string, mimeType?: string): Promise<string>;
    /**
     * Parse JSON response from Gemini
     */
    parseJsonResponse<T>(response: string): T;
}
export declare function getGeminiClient(): GeminiClient;
