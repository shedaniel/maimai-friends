"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import { Region, Snapshot } from "@/lib/types";

interface DataContentProps {
  region: Region;
  selectedSnapshot: Snapshot | null;
  isLoading: boolean;
}

export function DataContent({ 
  region, 
  selectedSnapshot, 
  isLoading
}: DataContentProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
            <span>Loading data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selectedSnapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Snapshot Data</CardTitle>
          <CardDescription>
            Snapshot from {selectedSnapshot.fetchedAt.toLocaleString()} • {selectedSnapshot.displayName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-md p-4">
            <pre className="text-sm overflow-auto max-h-96">
              {JSON.stringify(selectedSnapshot, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-8 text-center">
        <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No Data Available</h3>
        <p className="text-muted-foreground">
          {region === "jp" 
            ? "Japan region support is coming soon." 
            : "Get started by fetching your maimai data using the fetch button above."
          }
        </p>
      </CardContent>
    </Card>
  );
} 