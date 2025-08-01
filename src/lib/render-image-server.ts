import { getCachedImagePath } from "./image_cacher";
import { fabric } from 'fabric';

// Helper function to check if a URL is a data URL (base64)
function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

// Server-only function for fetching images with Node.js modules
export async function fetchImageForServer(url: string): Promise<string> {
  try {
    let finalUrl = url;
    
    // For maimaidx URLs, use caching system
    if (url.includes('maimaidx.jp') || url.includes('maimaidx-eng.com')) {
      finalUrl = await getCachedImagePath(url);
    }
    
    let buffer: Buffer;
    let contentType: string;

    if (finalUrl.startsWith('/')) {
      // Local file - read directly from filesystem
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Convert URL path to filesystem path (remove leading /, add public/)
      const filePath = path.join(process.cwd(), 'public', finalUrl);
      
      buffer = await fs.readFile(filePath);
      
      // Determine content type from file extension
      const ext = path.extname(finalUrl).toLowerCase();
      contentType = ext === '.png' ? 'image/png' 
        : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
        : ext === '.gif' ? 'image/gif'
        : ext === '.webp' ? 'image/webp'
        : ext === '.svg' ? 'image/svg+xml'
        : 'image/png'; // default fallback
    } else {
      const { Agent } = await import('undici');
      const httpsAgent = new Agent({
        connect: {
          rejectUnauthorized: false
        }
      });
      const response = await fetch(finalUrl, {
        // @ts-ignore - dispatcher property exists but TypeScript doesn't recognize it
        dispatcher: httpsAgent,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      contentType = response.headers.get('content-type') || 'image/png';
    }
    
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('Error loading image for server-side rendering:', error);
    throw error;
  }
}

// Server-only fabric image creation
export async function fabricImageFromURLServer(
  url: string, 
  fabricOptions: any = {}
): Promise<fabric.Image> {
  if (isDataUrl(url)) {
    return new Promise((resolve) => {
      fabric.Image.fromURL(url, image => resolve(image), fabricOptions)!
    });
  }
  
  const base64Url = await fetchImageForServer(url);
  return new Promise((resolve) => {
    fabric.Image.fromURL(base64Url, image => resolve(image), fabricOptions)!
  });
} 