/**
 * Get dimensions of a base64 image
 */
export const getImageDimensions = (base64Url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64Url;
  });
};

/**
 * Resize a base64 image to specific dimensions using smart crop/fill
 * This avoids stretching by cropping or adding letterboxing
 */
export const resizeImage = (
  base64Url: string,
  targetWidth: number,
  targetHeight: number,
  mode: 'crop' | 'fit' | 'stretch' = 'crop'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Use high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const srcWidth = img.width;
      const srcHeight = img.height;
      const srcRatio = srcWidth / srcHeight;
      const targetRatio = targetWidth / targetHeight;

      let drawX = 0, drawY = 0, drawWidth = targetWidth, drawHeight = targetHeight;
      let srcX = 0, srcY = 0, srcDrawWidth = srcWidth, srcDrawHeight = srcHeight;

      if (mode === 'crop') {
        // Crop mode: Fill the canvas, crop excess (no distortion)
        if (srcRatio > targetRatio) {
          // Source is wider - crop sides
          srcDrawWidth = srcHeight * targetRatio;
          srcX = (srcWidth - srcDrawWidth) / 2;
        } else {
          // Source is taller - crop top/bottom
          srcDrawHeight = srcWidth / targetRatio;
          srcY = (srcHeight - srcDrawHeight) / 2;
        }
        ctx.drawImage(img, srcX, srcY, srcDrawWidth, srcDrawHeight, 0, 0, targetWidth, targetHeight);
      } else if (mode === 'fit') {
        // Fit mode: Fit entire image, add black bars (letterbox)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        if (srcRatio > targetRatio) {
          // Source is wider - add top/bottom bars
          drawHeight = targetWidth / srcRatio;
          drawY = (targetHeight - drawHeight) / 2;
        } else {
          // Source is taller - add side bars
          drawWidth = targetHeight * srcRatio;
          drawX = (targetWidth - drawWidth) / 2;
        }
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      } else {
        // Stretch mode: Simple stretch (may distort)
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      }

      // Convert to base64 PNG (lossless)
      const resizedBase64 = canvas.toDataURL('image/png');
      resolve(resizedBase64);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for resizing'));
    };

    img.src = base64Url;
  });
};

/**
 * Get target resolution based on quality and aspect ratio
 */
export const getTargetResolution = (
  quality: '1K' | '2K',
  aspectRatio: string
): { width: number; height: number } | null => {
  const resolutionMap: Record<string, Record<string, { width: number; height: number }>> = {
    '1K': {
      '1:1': { width: 1024, height: 1024 },
      '3:4': { width: 1080, height: 1440 },
      '4:3': { width: 1440, height: 1080 },
      '9:16': { width: 1080, height: 1920 },
      '16:9': { width: 1920, height: 1080 }
    },
    '2K': {
      '1:1': { width: 2048, height: 2048 },
      '3:4': { width: 2160, height: 2880 },
      '4:3': { width: 2880, height: 2160 },
      '9:16': { width: 2160, height: 3840 },
      '16:9': { width: 3840, height: 2160 }
    }
  };

  // Check if it's a standard ratio
  if (resolutionMap[quality]?.[aspectRatio]) {
    return resolutionMap[quality][aspectRatio];
  }

  // Check if it's a custom resolution (e.g., "1920x1080")
  if (aspectRatio.includes('x')) {
    const [w, h] = aspectRatio.split('x').map(Number);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      return { width: w, height: h };
    }
  }

  return null;
};
