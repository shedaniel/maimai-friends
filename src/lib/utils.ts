import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to handle maimaidx image URLs with SSL issues
// Sync version for client-side React components
export function createSafeMaimaiImageUrl(originalUrl: string): string {
  // Check if it's a maimaidx domain
  if (originalUrl.includes('maimaidx.jp') || originalUrl.includes('maimaidx-eng.com')) {
    // On client side, always use proxy (cache check would require server-side APIs)
    const encodedUrl = encodeURIComponent(originalUrl);
    return `/api/image-proxy?url=${encodedUrl}`;
  }
  
  // Return original URL for other domains
  return originalUrl;
}

// Async version for server-side with cache checking
export async function createSafeMaimaiImageUrlAsync(originalUrl: string): Promise<string> {
  // Check if it's a maimaidx domain
  if (originalUrl.includes('maimaidx.jp') || originalUrl.includes('maimaidx-eng.com')) {
    // Check if we're on the server and can access filesystem
    if (typeof window === 'undefined') {
      try {
        // Check if image is already cached
        const { createHash } = await import('crypto');
        const urlHash = createHash('md5').update(originalUrl).digest('hex');
        
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const cacheDir = path.join(process.cwd(), 'public', 'res', 'preloaded');
        const possibleExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
        
        // Check if cached file exists with any extension
        for (const ext of possibleExtensions) {
          const cachedFilePath = path.join(cacheDir, `${urlHash}.${ext}`);
          try {
            await fs.access(cachedFilePath);
            // File exists, return direct URL to cached file
            const cachedUrl = `/res/preloaded/${urlHash}.${ext}`;
            console.debug(`Using cached URL: ${cachedUrl} for ${originalUrl}`);
            return cachedUrl;
          } catch {
            // File doesn't exist, continue checking other extensions
          }
        }
      } catch (error) {
        console.log('Cache check failed, falling back to proxy:', error);
      }
    }
    
    // Image not cached or we're on client side, use proxy
    const encodedUrl = encodeURIComponent(originalUrl);
    return `/api/image-proxy?url=${encodedUrl}`;
  }
  
  // Return original URL for other domains
  return originalUrl;
}
