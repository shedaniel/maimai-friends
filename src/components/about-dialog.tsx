"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>About ともマイ</DialogTitle>
          <DialogDescription>
            A modern web application for tracking and analyzing your maimai DX scores with friends.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Disclaimer</h3>
            <p className="text-sm">
              This is an <strong>unofficial project</strong> and is not affiliated with, endorsed by, or connected to SEGA Corporation or any of its subsidiaries. maimai DX is a trademark of SEGA Corporation.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">Acknowledgments</h3>
            <div className="space-y-2 text-sm">
              <p><strong>SEGA</strong> for creating maimai DX</p>
              <p><strong><a href="https://github.com/gekichumai/dxrating" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">dxrating</a></strong> for providing internal level data</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">License & Source Code</h3>
            <div className="space-y-2 text-sm">
              <p>
                This project is licensed under the <strong>GNU Affero General Public License v3.0 (AGPL-3.0)</strong>.
                <br />
                TL;DR: You are free to use, modify, and distribute the code, but you must provide the source code for any modifications.
              </p>
              <p>Source code is available on GitHub:</p>
              <a 
                href="https://github.com/shedaniel/maimai-friends" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block hover:underline font-mono text-xs bg-gray-200 px-3 py-2 rounded"
              >
                https://github.com/shedaniel/maimai-friends
              </a>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-center text-sm text-muted-foreground">
              Built with ❤️ for the maimai community
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 