import { inject, Injectable } from '@angular/core';
import { environment } from '@environment';
import { GoogleGenAI } from '@google/genai';
import * as Sentry from '@sentry/angular';
import { LoggerService } from '@core/services/infrastructure/logger.service';

@Injectable({
  providedIn: 'root',
})
export class GeminiClientService {
  private readonly logger = inject(LoggerService).createChildLogger('GeminiClientService');
  private client: GoogleGenAI | null = null;

  constructor() {
    this.initClient();
  }

  private initClient() {
    if (!environment.geminiApiKey) {
      this.logger.warn('Gemini API Key not configured - GenAI client disabled');
      return;
    }

    try {
      const genAI = new GoogleGenAI({ apiKey: environment.geminiApiKey });

      // Manual instrumentation (automated one not available in current Sentry version)
      this.client = genAI;

      this.logger.info('Google GenAI Client initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Google GenAI Client', error);
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
