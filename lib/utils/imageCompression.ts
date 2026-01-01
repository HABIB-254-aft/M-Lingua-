/**
 * Compress and resize an image file to ensure it fits within Firestore's 1MB limit
 * @param file The image file to compress
 * @param maxWidth Maximum width (default: 800px)
 * @param maxHeight Maximum height (default: 800px)
 * @param quality JPEG quality (0-1, default: 0.8)
 * @param maxSizeBytes Maximum size in bytes (default: 900KB to leave room for base64 overhead)
 * @returns Promise<string> Base64-encoded image
 */
export async function compressImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.8,
  maxSizeBytes: number = 900 * 1024 // 900KB (leaving room for base64 overhead)
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        // Resize if necessary
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with quality compression
        let base64 = canvas.toDataURL('image/jpeg', quality);
        let currentQuality = quality;
        let currentWidth = width;
        let currentHeight = height;
        let currentCanvas = canvas;
        let currentCtx: CanvasRenderingContext2D | null = ctx;
        
        // Keep compressing until we're under the size limit
        while (base64.length > maxSizeBytes) {
          // Try reducing quality first
          if (currentQuality > 0.1) {
            currentQuality -= 0.1;
            base64 = currentCanvas.toDataURL('image/jpeg', currentQuality);
            if (base64.length <= maxSizeBytes) {
              break;
            }
          }
          
          // If quality reduction didn't work, reduce dimensions
          currentWidth = Math.round(currentWidth * 0.85);
          currentHeight = Math.round(currentHeight * 0.85);
          
          // Minimum size check
          if (currentWidth < 100 || currentHeight < 100) {
            // If we can't compress further, use the smallest size with lowest quality
            currentCanvas = document.createElement('canvas');
            currentCanvas.width = 100;
            currentCanvas.height = 100;
            const finalCtx = currentCanvas.getContext('2d');
            if (finalCtx) {
              finalCtx.drawImage(img, 0, 0, 100, 100);
              base64 = currentCanvas.toDataURL('image/jpeg', 0.5);
            }
            break;
          }
          
          // Create new canvas with smaller dimensions
          currentCanvas = document.createElement('canvas');
          currentCanvas.width = currentWidth;
          currentCanvas.height = currentHeight;
          currentCtx = currentCanvas.getContext('2d');
          
          if (!currentCtx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          currentCtx.drawImage(img, 0, 0, currentWidth, currentHeight);
          base64 = currentCanvas.toDataURL('image/jpeg', 0.7);
          currentQuality = 0.7;
        }
        
        resolve(base64);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

