import { Injectable } from '@angular/core';
import * as ort from 'onnxruntime-web';
import { environment } from '../../../environments/environment';

/**
 * Servicio para remover el fondo de imágenes usando ONNX Runtime Web
 * Modelo: RMBG-1.4 (Background Removal)
 */
@Injectable({
  providedIn: 'root',
})
export class BackgroundRemovalService {
  private session: ort.InferenceSession | null = null;
  private isLoading = false;

  /**
   * Carga el modelo ONNX (lazy loading)
   */
  async loadModel(): Promise<void> {
    if (this.session) {
      return; // Ya está cargado
    }

    if (this.isLoading) {
      // Esperar a que termine de cargar
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (this.session || !this.isLoading) {
            clearInterval(interval);
            resolve(true);
          }
        }, 100);
      });
      return;
    }

    this.isLoading = true;

    try {
      console.log('[BackgroundRemoval] Loading RMBG-1.4 model...');
      const modelUrl = environment.backgroundRemovalModelUrl || '/assets/models/rmbg-1.4.onnx';

      this.session = await ort.InferenceSession.create(modelUrl, {
        executionProviders: ['wasm'], // WebAssembly backend
      });

      console.log('✅ [BackgroundRemoval] Model loaded successfully');
    } catch (error) {
      console.error('❌ [BackgroundRemoval] Failed to load model:', error);
      throw new Error('Failed to load background removal model');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Remueve el fondo de una imagen
   * @param imageFile Archivo de imagen original
   * @returns Blob de imagen PNG con fondo transparente
   */
  async removeBackground(imageFile: File): Promise<Blob> {
    console.log('[BackgroundRemoval] Processing image:', imageFile.name);

    // 1. Cargar modelo si no está cargado
    await this.loadModel();

    if (!this.session) {
      throw new Error('Model not loaded');
    }

    // 2. Cargar imagen
    const img = await this.loadImage(imageFile);
    console.log(`[BackgroundRemoval] Image loaded: ${img.width}x${img.height}`);

    // 3. Preparar canvas para resize a 1024x1024 (input del modelo)
    const inputSize = 1024;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = inputSize;
    canvas.height = inputSize;

    // Mantener aspect ratio
    const scale = Math.min(inputSize / img.width, inputSize / img.height);
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const offsetX = (inputSize - scaledWidth) / 2;
    const offsetY = (inputSize - scaledHeight) / 2;

    // Fondo negro para padding
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, inputSize, inputSize);

    // Dibujar imagen centrada
    ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

    // 4. Obtener datos de imagen
    const imageData = ctx.getImageData(0, 0, inputSize, inputSize);

    // 5. Preprocesar: convertir RGBA a RGB normalizado [0-1]
    // ONNX espera formato [1, 3, 1024, 1024] (NCHW)
    const input = new Float32Array(1 * 3 * inputSize * inputSize);
    const pixelCount = inputSize * inputSize;

    for (let i = 0; i < imageData.data.length; i += 4) {
      const idx = i / 4;
      const r = imageData.data[i] / 255;
      const g = imageData.data[i + 1] / 255;
      const b = imageData.data[i + 2] / 255;

      // Formato NCHW (batch, channels, height, width)
      input[idx] = r; // Red channel
      input[pixelCount + idx] = g; // Green channel
      input[2 * pixelCount + idx] = b; // Blue channel
    }

    console.log('[BackgroundRemoval] Running inference...');

    // 6. Crear tensor ONNX
    const inputTensor = new ort.Tensor('float32', input, [1, 3, inputSize, inputSize]);

    // 7. Ejecutar inferencia
    const feeds = { input: inputTensor };
    const results = await this.session.run(feeds);

    console.log('[BackgroundRemoval] Inference complete');

    // 8. Obtener máscara (output es [1, 1, 1024, 1024])
    const outputTensor = results['output'];
    const mask = outputTensor.data as Float32Array;

    // 9. Crear canvas de salida con dimensiones originales
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = img.width;
    outputCanvas.height = img.height;
    const outputCtx = outputCanvas.getContext('2d')!;

    // Dibujar imagen original
    outputCtx.drawImage(img, 0, 0);

    const outputData = outputCtx.getImageData(0, 0, img.width, img.height);

    // 10. Aplicar máscara (con resize si es necesario)
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        // Mapear coordenadas de salida a coordenadas de máscara
        const maskX = Math.floor(offsetX + (x / img.width) * scaledWidth);
        const maskY = Math.floor(offsetY + (y / img.height) * scaledHeight);

        if (maskX >= 0 && maskX < inputSize && maskY >= 0 && maskY < inputSize) {
          const maskIdx = maskY * inputSize + maskX;
          const maskValue = mask[maskIdx];

          // Aplicar máscara al canal alpha
          const pixelIdx = (y * img.width + x) * 4;
          outputData.data[pixelIdx + 3] = Math.round(maskValue * 255);
        } else {
          // Fuera de la máscara = transparente
          const pixelIdx = (y * img.width + x) * 4;
          outputData.data[pixelIdx + 3] = 0;
        }
      }
    }

    outputCtx.putImageData(outputData, 0, 0);

    console.log('[BackgroundRemoval] ✅ Background removed successfully');

    // 11. Convertir a blob PNG
    return new Promise((resolve, reject) => {
      outputCanvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/png');
    });
  }

  /**
   * Carga una imagen desde un File
   */
  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src); // Liberar memoria
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image'));
      };
      img.src = URL.createObjectURL(file);
    });
  }
}
