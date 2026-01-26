import https from 'https';

export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
export const MOCK_GEMINI = process.env.MOCK_GEMINI === 'true';
export const MODEL_NAME = 'gemini-3-pro-preview';

interface GeminiPart {
    text: string;
}

interface GeminiContent {
    role: string;
    parts: GeminiPart[];
}

interface GeminiRequest {
    contents: GeminiContent[];
    generationConfig?: {
        temperature?: number;
        maxOutputTokens?: number;
    };
    systemInstruction?: {
        parts: GeminiPart[];
    };
}

export interface GeminiResponse<T = any> {
    parsed: T;
}

export async function callGemini<T>(
    prompt: string,
    context: string,
    systemPrompt: string,
    mockResponse?: T
): Promise<T> {

    if (!GOOGLE_API_KEY && !MOCK_GEMINI) {
        throw new Error('❌ Error: GOOGLE_API_KEY is not set in environment variables.');
    }

    if (MOCK_GEMINI) {
        console.log('🧪 MOCK_GEMINI active: Returning simulated response.');
        if (!mockResponse) {
            throw new Error('Mock response required when MOCK_GEMINI is true');
        }
        return mockResponse;
    }

    // Construcción del endpoint
    const hostname = 'generativelanguage.googleapis.com';
    const path = `/v1beta/models/${MODEL_NAME}:generateContent?key=${GOOGLE_API_KEY}`;

    const data: GeminiRequest = {
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        contents: [
            {
                role: 'user',
                parts: [{ text: `CONTEXT:\n${context}\n\nPROMPT:\n${prompt}\n\nPlease provide the JSON response.` }]
            }
        ],
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);

                    if (response.error) {
                        reject(new Error(`Gemini API Error: ${response.error.message}`));
                        return;
                    }

                    if (!response.candidates || response.candidates.length === 0) {
                        reject(new Error('Gemini returned no candidates.'));
                        return;
                    }

                    const rawText = response.candidates[0].content.parts[0].text;
                    const jsonText = rawText.replace(/^```json\n/, '').replace(/^```\n/, '').replace(/```$/, '');

                    try {
                        const parsed: T = JSON.parse(jsonText);
                        resolve(parsed);
                    } catch (parseError) {
                        console.error('Failed to parse Gemini JSON:', jsonText);
                        reject(new Error('Gemini did not return valid JSON.'));
                    }

                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(data));
        req.end();
    });
}
