"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { renderImage } from "@/lib/render-image";
import { SnapshotWithSongs } from "@/lib/types";
import { fabric } from "fabric";
import { Download, Loader2, RefreshCw, Server } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

interface ExportImageCardProps {
  selectedSnapshotData: SnapshotWithSongs;
}

export function ExportImageCard({ selectedSnapshotData }: ExportImageCardProps) {
  const t = useTranslations();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.StaticCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isServerGenerating, setIsServerGenerating] = useState(false);

  // Canvas dimensions - actual size for rendering
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 2020;

  const updateCanvasScale = () => {
    if (canvasRef.current && containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const scale = containerWidth / CANVAS_WIDTH;
      
      canvasRef.current.style.transform = `scale(${scale})`;
      canvasRef.current.style.transformOrigin = 'top left';
    }
  };

  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      // Set canvas element dimensions to actual size
      canvasRef.current.width = CANVAS_WIDTH;
      canvasRef.current.height = CANVAS_HEIGHT;

      // Initialize Fabric.js canvas with actual rendering dimensions
      fabricCanvasRef.current = new fabric.StaticCanvas(canvasRef.current, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      });

      // Initial render
      renderImage(fabricCanvasRef.current, selectedSnapshotData);
    }

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [selectedSnapshotData]);

  useEffect(() => {
    // Small delay to ensure container is properly sized
    const timer = setTimeout(() => {
      updateCanvasScale();
    }, 100);
    
    const handleResize = () => updateCanvasScale();
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [containerRef.current]);

  const handleExport = () => {
    if (fabricCanvasRef.current) {
      // Export the canvas at full resolution
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1, // Keep original size (1200x1920)
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `maimai-profile-${selectedSnapshotData.snapshot.displayName || 'export'}.png`;
      link.href = dataURL;
      link.click();
    }
  };

  const handleServerDownload = async () => {
    try {
      setIsServerGenerating(true);
      
      // Call the API to generate the image
      const response = await fetch('/api/export-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedSnapshotData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      // Get the image blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `maimai-profile-${selectedSnapshotData.snapshot.displayName || 'export'}.png`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Failed to export image:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsServerGenerating(false);
    }
  };

  const handleRefresh = () => {
    if (fabricCanvasRef.current) {
      renderImage(fabricCanvasRef.current, selectedSnapshotData);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          {t('dataContent.tabs.exportImage')}
        </CardTitle>
        <CardDescription>
          Export your maimai profile as a high-quality image
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={handleExport} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download (Client)
            </Button>
            <Button 
              onClick={handleServerDownload} 
              disabled={isServerGenerating}
              variant="secondary" 
              className="flex items-center gap-2"
            >
              {isServerGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Server className="h-4 w-4" />
                  Download (Server)
                </>
              )}
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            )}
          </div>
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p><strong>Client:</strong> Fast, direct canvas export</p>
            <p><strong>Server:</strong> High-quality server-rendered image with better font support</p>
          </div>
          <div
            ref={containerRef}
            className="border rounded-xl overflow-hidden shadow-sm w-full"
            style={{
              aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: `${CANVAS_WIDTH}px`,
                height: `${CANVAS_HEIGHT}px`,
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 