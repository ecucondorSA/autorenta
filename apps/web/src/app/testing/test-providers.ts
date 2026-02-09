/**
 * Shared test providers for Angular unit tests
 * Import these in TestBed.configureTestingModule({ providers: [...testProviders] })
 */

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { MockSupabaseClientService } from './mocks/supabase-client.mock';

/**
 * Common providers needed by most services
 * Includes HttpClient, Router, and Location mocks
 */
export const testProviders = [
  provideHttpClient(),
  provideHttpClientTesting(),
  provideRouter([]),
  provideLocationMocks(),
  { provide: SupabaseClientService, useClass: MockSupabaseClientService },
];

/**
 * Minimal providers for services that only need HttpClient
 */
export const httpTestProviders = [provideHttpClient(), provideHttpClientTesting()];
