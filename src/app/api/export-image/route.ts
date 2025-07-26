import { SnapshotWithSongs } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';
import { fabric } from 'fabric';

export async function POST(request: NextRequest) {
  try {
    const data: SnapshotWithSongs = await request.json();
    
    const canvas = new fabric.StaticCanvas(null, {
      width: 1200,
      height: 2020,
    });
    await require("@/lib/render-image").renderImage(canvas, data);
    const dataUrl = canvas.toDataURL({format: 'png'});

    // Remove base64 prefix and convert to buffer
    const buffer = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
    
    // Sanitize filename to remove non-ASCII characters
    const sanitizedName = (data.snapshot.displayName || 'export')
      .replace(/[^\x20-\x7E]/g, '') // Remove non-ASCII characters
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
      .trim() || 'export'; // Fallback if name becomes empty
    
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="maimai-profile-${sanitizedName}.png"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Failed to generate image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
