import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, interval, of, throwError } from 'rxjs';
import { map, switchMap, takeWhile, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  TripoTaskRequest,
  TripoTaskResponse,
  TripoTaskStatusResponse,
} from '../models/tripo.models';

@Injectable({
  providedIn: 'root',
})
export class TripoService {
  private apiUrl = 'https://api.tripo3d.ai/v2/openapi/task';
  private apiKey = environment.tripoApiKey; // We will add this to environment

  constructor(private http: HttpClient) {}

  /**
   * Starts a new image-to-3D generation task
   * @param imageUrl Publicly accessible URL of the image
   */
  createTask(imageUrl: string): Observable<string> {
    if (!this.apiKey) {
      return throwError(() => new Error('Tripo API Key is missing'));
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    });

    const body: TripoTaskRequest = {
      type: 'image_to_model',
      file: {
        type: 'jpg', // Defaulting to jpg, API is flexible
        url: imageUrl,
      },
    };

    return this.http.post<TripoTaskResponse>(this.apiUrl, body, { headers }).pipe(
      map((response) => {
        if (response.code !== 0) {
          throw new Error(response.message || 'Failed to start task');
        }
        return response.data.task_id;
      }),
    );
  }

  /**
   * Polls the task status until it completes or fails
   * @param taskId The ID of the task to poll
   */
  pollTaskStatus(taskId: string): Observable<string> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.apiKey}`,
    });

    return interval(2000)
      .pipe(
        // Poll every 2 seconds
        switchMap(() =>
          this.http.get<TripoTaskStatusResponse>(`${this.apiUrl}/${taskId}`, { headers }),
        ),
        map((response) => response.data),
        takeWhile(
          (data) =>
            data.status !== 'SUCCESS' && data.status !== 'FAILED' && data.status !== 'CANCELLED',
          true,
        ),
        switchMap((data) => {
          if (data.status === 'FAILED' || data.status === 'CANCELLED') {
            return throwError(() => new Error(`Task failed with status: ${data.status}`));
          }
          if (data.status === 'SUCCESS') {
            // Handle different response structures if necessary
            const modelUrl = data.output?.model || data.result?.model?.url;
            if (!modelUrl) {
              return throwError(() => new Error('Task succeeded but no model URL found'));
            }
            return of(modelUrl);
          }
          return of(null); // Continue polling
        }),
        timeout(300000), // 5 minute timeout
        // Filter out nulls (intermediate states)
        map((result) => result as string),
        // We need to filter the stream to only emit the final result, but takeWhile(inclusive=true) emits the last value.
        // The logic above returns Observable<string | null>. We want to ignore nulls.
      )
      .pipe(
        // Simple filter to ignore the 'null' emissions from running state
        switchMap((val) => (val ? of(val) : new Observable<never>())),
      );
  }

  /**
   * Apply AI-generated textures to an existing 3D model using text prompts
   * @param modelUrl URL of the GLB model to texturize
   * @param texturePrompt Description of desired texture (e.g., "red metallic car paint with chrome details")
   * @returns Observable with task ID
   */
  applyTextureFromPrompt(modelUrl: string, texturePrompt: string): Observable<string> {
    if (!this.apiKey) {
      return throwError(() => new Error('Tripo API Key is missing'));
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    });

    const body: TripoTaskRequest = {
      type: 'text_to_texture',
      original_model_url: modelUrl,
      text: texturePrompt,
    };

    return this.http.post<TripoTaskResponse>(this.apiUrl, body, { headers }).pipe(
      map((response) => {
        if (response.code !== 0) {
          throw new Error(response.message || 'Failed to start texturization task');
        }
        return response.data.task_id;
      }),
    );
  }

  /**
   * Complete workflow: Apply texture and wait for result
   * @param modelUrl URL of the GLB model to texturize
   * @param texturePrompt Description of desired texture
   * @returns Observable with the URL of the textured model
   */
  texturizeModel(modelUrl: string, texturePrompt: string): Observable<string> {
    return this.applyTextureFromPrompt(modelUrl, texturePrompt).pipe(
      switchMap((taskId) => this.pollTaskStatus(taskId)),
    );
  }
}
