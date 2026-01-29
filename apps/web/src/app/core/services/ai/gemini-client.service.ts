import { Injectable } from '@angular/core';
import { environment } from '@environment';
import { GoogleGenAI } from '@google/genai';
import * as Sentry from '@sentry/angular';

@Injectable({
  providedIn: 'root',
})
export class GeminiClientService {
  private client: GoogleGenAI | null = null;

  constructor() {
    this.initClient();
  }

  private initClient() {
    if (!environment.geminiApiKey) {
      console.warn('⚠️ Gemini API Key not configured - GenAI client disabled');
      return;
    }

    try {
      const genAI = new GoogleGenAI({ apiKey: environment.geminiApiKey });

      // Manual instrumentation (automated one not available in current Sentry version)
      this.client = genAI;

      console.log('✅ Google GenAI Client initialized');
    } catch (error) {
      console.error('Failed to initialize Google GenAI Client:', error);
    }
  }

  /**
   * Generate content using the Gemini model
   * @param prompt The prompt to send to the model
   * @param modelName Model name (default: gemini-2.0-flash-exp)
   */
  async generateContent(prompt: string, modelName = 'gemini-2.0-flash-exp') {
    if (!this.client) {
      const error = new Error('Google GenAI Client is not initialized (check geminiApiKey)');
      Sentry.captureException(error);
      throw error;
    }

    return await Sentry.startSpan(
      {
        name: 'Gemini Generate Content',
        op: 'ai.generation',
        attributes: {
          'ai.model_id': modelName,
          'ai.provider': 'google',
        },
      },
      async (span) => {
        try {
          const response = await this.client!.models.generateContent({
            model: modelName,
            contents: prompt,
          });

          // Record success (1 = OK)
          span?.setStatus({ code: 1 });
          return response;
        } catch (error) {
          // Record error (2 = Error)
          span?.setStatus({ code: 2, message: String(error) });
          Sentry.captureException(error);
          throw error;
        }
      },
    );
  }
}
