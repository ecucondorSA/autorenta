export interface TripoTaskRequest {
  type: 'image_to_model' | 'text_to_texture';
  file?: {
    type: 'jpg' | 'png' | 'jpeg';
    url: string; // The URL of the image to convert
  };
  // For text_to_texture
  model_task_id?: string; // Reference to an existing model task
  draft_model_task_id?: string; // Alternative: reference to draft model
  original_model_url?: string; // Or direct URL to GLB file
  text?: string; // Texture prompt (e.g., "red metallic car paint")
}

export interface TripoTaskResponse {
  code: number;
  data: {
    task_id: string;
  };
  message?: string;
}

export interface TripoTaskStatusResponse {
  code: number;
  data: {
    task_id: string;
    status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
    progress: number;
    output?: {
      model?: string; // URL to the .glb model
      base_model?: string;
      render?: string;
    };
    result?: { // Sometimes the API returns result instead of output depending on version
      model?: {
        url: string;
        type: string;
      }
    }
  };
}
