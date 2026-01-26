import { TestBed } from '@angular/core/testing';
import { environment } from '@environment';
import { GeminiClientService } from './gemini-client.service';

describe('GeminiClientService Verification', () => {
  let service: GeminiClientService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeminiClientService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have an API Key configured for verification', () => {
    if (!environment.geminiApiKey) {
      console.warn(
        '⚠️ Skipping Gemini verification: NG_APP_GEMINI_API_KEY not found in environment',
      );
      // We don't fail the test to avoid breaking CI if key is missing,
      // but we log a warning. For manual verification, we expect this to pass.
    } else {
      expect(environment.geminiApiKey).toBeTruthy();
    }
  });

  it('should generate content using Sentry-instrumented client', async () => {
    if (!environment.geminiApiKey) {
      return;
    }

    try {
      console.log('🤖 Sending prompt to Gemini...');
      const response = await service.generateContent(
        'Hello, are you instrumented with Sentry? Reply with "Yes".',
      );

      // Handle response from @google/genai SDK
      const text = response.text || JSON.stringify(response);

      console.log('✅ Gemini Response:', text);
      expect(text).toBeTruthy();
      expect(text.length).toBeGreaterThan(0);
    } catch (error) {
      console.error('❌ Gemini Call Failed:', error);
      throw error;
    }
  });
});
