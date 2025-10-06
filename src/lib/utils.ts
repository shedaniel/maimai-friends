import { clsx, type ClassValue } from "clsx";

export const SAFE_MAIMAI_IMAGE_URLS = [
  'maimaidx.jp',
  'maimaidx-eng.com',
  'cdn.gamerch.com',
  'maimai.sega.jp',
]

import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to handle maimaidx image URLs with SSL issues
// Sync version for client-side React components
export function createSafeMaimaiImageUrl(originalUrl: string): string {
  // Check if it's a maimaidx domain
  if (SAFE_MAIMAI_IMAGE_URLS.some(domain => originalUrl.includes(domain))) {
    // On client side, always use proxy (cache check would require server-side APIs)
    const encodedUrl = encodeURIComponent(originalUrl);
    return `/api/image-proxy?url=${encodedUrl}`;
  }
  
  // Return original URL for other domains
  return originalUrl;
}
