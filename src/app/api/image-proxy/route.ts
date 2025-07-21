import { NextRequest, NextResponse } from 'next/server';
import { Agent } from 'undici';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // Validate that this is a maimaidx domain for security
  if (!imageUrl.includes('maimaidx.jp') && !imageUrl.includes('maimaidx-eng.com')) {
    return new NextResponse('Unauthorized domain', { status: 403 });
  }

  try {
    // Create custom HTTPS agent that ignores SSL certificate issues for maimaidx domains
    const httpsAgent = new Agent({
      connect: {
        rejectUnauthorized: false
      }
    });

    const response = await fetch(imageUrl, {
      // @ts-ignore - dispatcher property exists but TypeScript doesn't recognize it
      dispatcher: httpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.status}`, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
      },
    });

  } catch (error) {
    console.error('Error proxying image:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 