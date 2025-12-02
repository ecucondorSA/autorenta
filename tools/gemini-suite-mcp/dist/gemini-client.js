import { GoogleGenAI } from '@google/genai';
export class GeminiClient {
    client;
    // Latest models (Dec 2025)
    modelPro = 'gemini-3-pro-preview'; // Most powerful, reasoning-first
    modelFlash = 'gemini-2.5-flash'; // Fast, good for vision
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }
        this.client = new GoogleGenAI({ apiKey });
    }
    /**
     * Generate content using Gemini Pro (for complex analysis)
     */
    async generatePro(prompt, systemPrompt) {
        try {
            const response = await this.client.models.generateContent({
                model: this.modelPro,
                contents: prompt,
                config: {
                    systemInstruction: systemPrompt,
                    temperature: 0.2,
                    maxOutputTokens: 8192,
                }
            });
            return response.text || '';
        }
        catch (error) {
            console.error('Gemini Pro error:', error.message);
            throw new Error(`Gemini API error: ${error.message}`);
        }
    }
    /**
     * Generate content using Gemini Flash (for quick tasks)
     */
    async generateFlash(prompt, systemPrompt) {
        try {
            const response = await this.client.models.generateContent({
                model: this.modelFlash,
                contents: prompt,
                config: {
                    systemInstruction: systemPrompt,
                    temperature: 0.3,
                    maxOutputTokens: 4096,
                }
            });
            return response.text || '';
        }
        catch (error) {
            console.error('Gemini Flash error:', error.message);
            throw new Error(`Gemini API error: ${error.message}`);
        }
    }
    /**
     * Analyze an image with Gemini Vision
     */
    async analyzeImage(imageBase64, prompt, mimeType = 'image/png') {
        try {
            const response = await this.client.models.generateContent({
                model: this.modelFlash, // Flash is good for vision
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                inlineData: {
                                    mimeType,
                                    data: imageBase64
                                }
                            },
                            { text: prompt }
                        ]
                    }
                ],
                config: {
                    temperature: 0.2,
                    maxOutputTokens: 4096, // Enough for full UI analysis
                }
            });
            return response.text || '';
        }
        catch (error) {
            console.error('Gemini Vision error:', error.message);
            throw new Error(`Gemini Vision error: ${error.message}`);
        }
    }
    /**
     * Parse JSON response from Gemini
     */
    parseJsonResponse(response) {
        if (!response || response.trim() === '') {
            throw new Error('Empty response from Gemini');
        }
        // Extract JSON from markdown code blocks if present
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        let jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();
        // Try to find JSON object in the response
        const startIndex = jsonStr.indexOf('{');
        const endIndex = jsonStr.lastIndexOf('}');
        if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
            throw new Error(`No valid JSON found in response: ${response.slice(0, 200)}`);
        }
        jsonStr = jsonStr.slice(startIndex, endIndex + 1);
        try {
            return JSON.parse(jsonStr);
        }
        catch (error) {
            throw new Error(`JSON parse failed: ${error}. Response: ${jsonStr.slice(0, 200)}`);
        }
    }
}
// Singleton instance
let instance = null;
export function getGeminiClient() {
    if (!instance) {
        instance = new GeminiClient();
    }
    return instance;
}
