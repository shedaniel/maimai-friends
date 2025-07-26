import { createHash } from 'crypto';

// Helper function to detect if we're on the server
function isServer() {
  return typeof window === 'undefined';
}

// Helper function to get file extension from content type
function getExtensionFromContentType(contentType: string): string {
  const typeMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  
  return typeMap[contentType.toLowerCase()] || 'png';
}

// Helper function to get file extension from URL
function getExtensionFromUrl(url: string): string {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  const lastDot = pathname.lastIndexOf('.');
  
  if (lastDot === -1) return 'png';
  
  const ext = pathname.substring(lastDot + 1).toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) ? ext : 'png';
}

// Generate a hash for the URL to use as filename
function generateUrlHash(url: string): string {
  return createHash('md5').update(url).digest('hex');
}

// Check if URL is from allowed maimaidx domains
function isMaimaidxDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('maimaidx.jp') || urlObj.hostname.includes('maimaidx-eng.com');
  } catch {
    return false;
  }
}

// Cache and return local path for maimaidx images
export async function getCachedImagePath(url: string): Promise<string> {
  // Only cache on server and for maimaidx domains
  if (!isServer() || !isMaimaidxDomain(url)) {
    return url;
  }

  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Generate hash for filename
    const urlHash = generateUrlHash(url);
    
    // Create cache directory if it doesn't exist
    const cacheDir = path.join(process.cwd(), 'public', 'res', 'preloaded');
    await fs.mkdir(cacheDir, { recursive: true });
    
    // Try to determine extension from URL first
    let extension = getExtensionFromUrl(url);
    
    // Check if file already exists with any common extension
    const possibleExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
    let existingFile: string | null = null;
    
    for (const ext of possibleExtensions) {
      const testPath = path.join(cacheDir, `${urlHash}.${ext}`);
      try {
        await fs.access(testPath);
        existingFile = `/res/preloaded/${urlHash}.${ext}`;
        // console.log(`Using cached image: ${existingFile}`);
        break;
      } catch {
        // File doesn't exist, continue
      }
    }
    
    if (existingFile) {
      return existingFile;
    }
    
    // File doesn't exist, fetch it
    // console.log(`Caching image from: ${url}`);
    
    const { Agent } = await import('undici');
    const httpsAgent = new Agent({
      connect: {
        rejectUnauthorized: false
      }
    });
    
    const response = await fetch(url, {
      // @ts-ignore - dispatcher property exists but TypeScript doesn't recognize it
      dispatcher: httpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Get proper extension from content type
    const contentType = response.headers.get('content-type') || 'image/png';
    extension = getExtensionFromContentType(contentType);
    
    // Save to cache
    const cachedFilePath = path.join(cacheDir, `${urlHash}.${extension}`);
    await fs.writeFile(cachedFilePath, buffer);
    
    const publicPath = `/res/preloaded/${urlHash}.${extension}`;
    // console.log(`Cached image saved: ${publicPath}`);
    
    return publicPath;
    
  } catch (error) {
    console.error('Error caching image:', error);
    // Fallback to original URL if caching fails
    return url;
  }
}

// Get cached image buffer for API routes
export async function getCachedImageBuffer(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!isServer() || !isMaimaidxDomain(url)) {
    return null;
  }

  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const urlHash = generateUrlHash(url);
    const cacheDir = path.join(process.cwd(), 'public', 'res', 'preloaded');
    
    // Check if cached file exists
    const possibleExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
    
    for (const ext of possibleExtensions) {
      const cachedFilePath = path.join(cacheDir, `${urlHash}.${ext}`);
      try {
        const buffer = await fs.readFile(cachedFilePath);
        const contentType = ext === 'png' ? 'image/png'
          : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
          : ext === 'gif' ? 'image/gif'
          : ext === 'webp' ? 'image/webp'
          : ext === 'svg' ? 'image/svg+xml'
          : 'image/png';
        
        // console.log(`Serving cached image buffer: ${urlHash}.${ext}`);
        return { buffer, contentType };
      } catch {
        // File doesn't exist, continue
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('Error reading cached image:', error);
    return null;
  }
} 