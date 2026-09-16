/**
 * Image processing utilities for device file upload.
 * Reads image files from local device storage, resizes and crops appropriately,
 * and converts them into lightweight, storage-friendly base64 data URLs.
 */

export function processProfileImageFile(file: File, maxDimension: number = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (JPEG, PNG, WebP, etc.).'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // Square center crop calculation
          const minSide = Math.min(width, height);
          const startX = (width - minSide) / 2;
          const startY = (height - minSide) / 2;

          // Target dimensions capped to maxDimension
          const targetSize = Math.min(minSide, maxDimension);
          canvas.width = targetSize;
          canvas.height = targetSize;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback to raw data URL if canvas 2D context is unavailable
            resolve(e.target?.result as string);
            return;
          }

          // Draw high-quality cropped and scaled square image
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(
            img,
            startX,
            startY,
            minSide,
            minSide,
            0,
            0,
            targetSize,
            targetSize
          );

          const quality = 0.88;
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          // Fallback to uncompressed data URL
          resolve(e.target?.result as string);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to parse selected image file.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Could not read image file from device.'));
    };

    reader.readAsDataURL(file);
  });
}
