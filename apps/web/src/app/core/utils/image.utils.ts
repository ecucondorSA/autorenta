export interface ImageOptimizeOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'webp' | 'jpeg';
}

/**
 * Optimizes an image file by resizing and compressing it.
 * @param file The original image file
 * @param options Optimization options (maxWidth, maxHeight, quality, format)
 * @returns Promise resolving to the optimized File
 */
export async function optimizeImage(file: File, options: ImageOptimizeOptions): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > options.maxWidth) {
        height = (height * options.maxWidth) / width;
        width = options.maxWidth;
      }

      if (height > options.maxHeight) {
        width = (width * options.maxHeight) / height;
        height = options.maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = `image/${options.format}`;
      const extension = options.format === 'jpeg' ? 'jpg' : options.format;

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(
              new File([blob], file.name.replace(/\.[^/.]+$/, `.${extension}`), { type: mimeType }),
            );
          } else {
            reject(new Error('Failed to optimize image'));
          }
        },
        mimeType,
        options.quality,
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
