"use client";

import { CANVAS_HEIGHT, CANVAS_WIDTH, renderImage } from "@/lib/render-image";
import { SnapshotWithSongs } from "@/lib/types";
import { fabric } from "fabric";
import { useEffect, useRef, useState } from "react";

interface RenderImageClientProps {
  data: SnapshotWithSongs;
  visitableProfileAt: string | null;
}

export default function RenderImageClient({ data, visitableProfileAt }: RenderImageClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.StaticCanvas | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function initCanvas() {
      console.log('🎨 Starting canvas initialization...');
      console.log('✅ Data received for:', data.snapshot.displayName);
      console.log('🎵 Songs count:', data.songs.length);
      
      if (!canvasRef.current) {
        console.error('❌ Canvas ref not ready');
        (window as any).lastError = 'Canvas not ready';
        return;
      }

      try {
        // Check if Fabric.js is loaded
        if (!(window as any).fabric) {
          console.error('❌ Fabric.js not loaded');
          (window as any).lastError = 'Fabric.js not loaded';
          return;
        }
        console.log('✅ Fabric.js is loaded');
        
        // Initialize Fabric.js canvas
        console.log('🖼️ Creating Fabric canvas...');
        fabricCanvasRef.current = new fabric.StaticCanvas(canvasRef.current, {
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        });
        console.log('✅ Fabric canvas created');

        // Render the image
        console.log('🎨 Starting image rendering...');
        const renderStartTime = Date.now();
        
        await renderImage(fabricCanvasRef.current, data, visitableProfileAt);
        
        const renderTime = Date.now() - renderStartTime;
        console.log(`✅ Image rendering completed in ${renderTime}ms`);
        
        // Mark as ready for Puppeteer
        setIsReady(true);
        
        // For Puppeteer to detect completion
        (window as any).renderComplete = true;
        console.log('🎉 Render complete flag set - ready for Puppeteer!');
        
      } catch (error) {
        console.error('💥 Error rendering image:', error);
        console.error('📍 Error stack:', error instanceof Error ? error.stack : 'No stack');
        (window as any).lastError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    console.log('🚀 Client component mounted, starting initialization...');
    initCanvas();

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [data, visitableProfileAt]);

  return (
    <div style={{ margin: 0, padding: '20px', background: '#f0f0f0' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ border: '1px solid #ccc', display: 'block' }}
      />
      {isReady && (
        <div id="render-status" style={{ display: 'none' }}>
          ready
        </div>
      )}
    </div>
  );
} 