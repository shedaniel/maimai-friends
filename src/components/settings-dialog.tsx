"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentTimezone?: string | null;
  onTimezoneUpdate: (timezone: string | null) => Promise<void>;
}

// Common timezones
const TIMEZONES = [
  { value: null, label: "Japan Standard Time", region: "JP" },
  { value: "Asia/Seoul", label: "Korea Standard Time", region: "KR" },
  { value: "Asia/Hong_Kong", label: "Hong Kong Standard Time", region: "HK" },
  { value: "Asia/Shanghai", label: "China Standard Time", region: "CN" },
  { value: "Asia/Taipei", label: "Taiwan Standard Time", region: "TW" },
  { value: "Asia/Singapore", label: "Singapore Standard Time", region: "SG" },
  { value: "Asia/Kuala_Lumpur", label: "Malaysia Standard Time", region: "MY" },
  { value: "Asia/Bangkok", label: "Thailand Standard Time", region: "TH" },
  { value: "Asia/Jakarta", label: "Indonesia Western Time (Jakarta)", region: "ID" },
  { value: "Asia/Makassar", label: "Indonesia Central Time (Makassar)", region: "ID" },
  { value: "Asia/Jayapura", label: "Indonesia Eastern Time (Jayapura)", region: "ID" },
  { value: "Asia/Manila", label: "Philippines Standard Time", region: "PH" },
  { value: "Asia/Ho_Chi_Minh", label: "Vietnam Standard Time", region: "VN" },
  { value: "Asia/Yangon", label: "Myanmar Standard Time", region: "MM" },
  { value: "Australia/Adelaide", label: "Australian Central Time (Adelaide)", region: "AU" },
  { value: "Australia/Eucla", label: "Australian Central Western Time (Eucla)", region: "AU" },
  { value: "Australia/Perth", label: "Australian Western Time (Perth)", region: "AU" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (Sydney)", region: "AU" },
  { value: "Australia/Lord_Howe", label: "Australian Lord Howe Time", region: "AU" },
  { value: "America/New_York", label: "Eastern Standard Time (New York)", region: "US" },
  { value: "America/Chicago", label: "Central Standard Time (Chicago)", region: "US" },
  { value: "America/Denver", label: "Mountain Standard Time (Denver)", region: "US" },
  { value: "America/Los_Angeles", label: "Pacific Standard Time (Los Angeles)", region: "US" },
  { value: "Europe/London", label: "Greenwich Mean Time (London)", region: "EU" },
  { value: "Europe/Paris", label: "Central European Time (Paris)", region: "EU" },
  { value: "Europe/Berlin", label: "Central European Time (Berlin)", region: "EU" },
  { value: "UTC", label: "Coordinated Universal Time (UTC)", region: "UTC" },
];

export function SettingsDialog({ isOpen, onClose, currentTimezone, onTimezoneUpdate }: SettingsDialogProps) {
  const [selectedTimezone, setSelectedTimezone] = useState<string | null>(currentTimezone ?? null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onTimezoneUpdate(selectedTimezone);
      onClose();
    } catch (error) {
      console.error("Failed to update timezone:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedTimezone(currentTimezone ?? null);
    onClose();
  };

  const getCurrentTimezoneDisplay = () => {
    const timezone = TIMEZONES.find(tz => 
      (tz.value === null && selectedTimezone === null) || 
      tz.value === selectedTimezone
    );
    return timezone?.value || "jp"; // Use "jp" as the key for null timezone
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your maimai friends experience.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select 
              value={getCurrentTimezoneDisplay()}
              onValueChange={(value) => {
                setSelectedTimezone(value === "jp" ? null : value);
              }}
            >
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((timezone) => (
                  <SelectItem 
                    key={timezone.value || "jp"} 
                    value={timezone.value || "jp"}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                        {timezone.region}
                      </span>
                      <span>{timezone.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This affects how dates and times are displayed throughout the app.
              Japan timezone is the default as it matches maimai&apos;s server time.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 