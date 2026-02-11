export const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://autorentar.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeminiResponse {
    candidates: Array<{
        content: {
            parts: Array<{
                text: string;
            }>;
        };
    }>;
    error?: {
        message: string;
    };
}

export async function callGemini(
    prompt: string,
    context: string,
    systemPrompt: string,
    apiKey: string,
    model: 'gemini-3-flash-preview' | 'gemini-2.0-flash' | 'gemini-1.5-pro' = 'gemini-3-flash-preview',
    temperature: number = 0.2
): Promise<string> {
    const hostname = 'generativelanguage.googleapis.com';
    const path = `/v1beta/models/${model}:generateContent`;

    const data = {
        systemInstruction: {
            parts: [{ text: systemPrompt }],
        },
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        text: `CONTEXT:\n${context}\n\nPROMPT:\n${prompt}\n\nPlease provide the requested output.`,
                    },
                ],
            },
        ],
        generationConfig: {
            temperature,
            maxOutputTokens: 8192,
        },
    };

    const response = await fetch(`https://${hostname}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(data),
    });

    const json: GeminiResponse = await response.json();

    if (json.error) {
        throw new Error(`Gemini API Error: ${json.error.message}`);
    }

    if (!json.candidates || json.candidates.length === 0) {
        throw new Error('Gemini returned no candidates.');
    }

    return json.candidates[0].content.parts[0].text;
}
