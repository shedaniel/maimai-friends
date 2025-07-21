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
import { Key, Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "@/components/providers/locale-provider";
import { Locale, setLocaleCookie } from "@/i18n/locale";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentTimezone?: string | null;
  currentLanguage?: string | null;
  onTimezoneUpdate: (timezone: string | null) => Promise<void>;
  onLanguageUpdate: (language: string | null) => Promise<void>;
  onOpenTokenDialog: () => void;
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



export function SettingsDialog({ isOpen, onClose, currentTimezone, currentLanguage, onTimezoneUpdate, onLanguageUpdate, onOpenTokenDialog }: SettingsDialogProps) {
  const t = useTranslations();
  const { setLocale } = useLocale();
  const [selectedTimezone, setSelectedTimezone] = useState<string | null>(currentTimezone ?? null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(currentLanguage ?? null);
  const [isLoading, setIsLoading] = useState(false);

  const LANGUAGES = [
    { value: null, label: t('settings.language.auto'), code: "AUTO" },
    { value: "en", label: t('settings.language.en'), code: "US" },
    { value: "en-GB", label: t('settings.language.en-GB'), code: "UK" },
    { value: "ja", label: t('settings.language.ja'), code: "JA" },
    { value: "zh-TW", label: t('settings.language.zh-TW'), code: "TW" },
    { value: "zh-CN", label: t('settings.language.zh-CN'), code: "CN" },
  ];

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        onTimezoneUpdate(selectedTimezone),
        onLanguageUpdate(selectedLanguage)
      ]);
      
      // Update the locale immediately if language changed
      if (selectedLanguage && selectedLanguage !== currentLanguage) {
        setLocaleCookie(selectedLanguage as Locale);
        setLocale(selectedLanguage as Locale);
      }
      
      onClose();
    } catch (error) {
      console.error("Failed to update settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedTimezone(currentTimezone ?? null);
    setSelectedLanguage(currentLanguage ?? null);
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
          <DialogTitle>{t('settings.title')}</DialogTitle>
          <DialogDescription>
            {t('settings.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="language">{t('settings.language.label')}</Label>
            <Select 
              value={selectedLanguage || "auto"}
              onValueChange={(value) => {
                setSelectedLanguage(value === "auto" ? null : value);
              }}
            >
              <SelectTrigger id="language">
                <SelectValue placeholder={t('settings.language.label')} />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((language) => (
                  <SelectItem 
                    key={language.value || "auto"} 
                    value={language.value || "auto"}
                  >
                    <div className="flex items-center space-x-2">
                      <Languages className="h-4 w-4" />
                      <span className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                        {language.code}
                      </span>
                      <span>{language.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('settings.language.description')}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="timezone">{t('settings.timezone.label')}</Label>
            <Select 
              value={getCurrentTimezoneDisplay()}
              onValueChange={(value) => {
                setSelectedTimezone(value === "jp" ? null : value);
              }}
            >
              <SelectTrigger id="timezone">
                <SelectValue placeholder={t('settings.timezone.placeholder')} />
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
              {t('settings.timezone.description')}
            </p>
          </div>

          <div className="grid gap-2">
            <Label>{t('settings.account.label')}</Label>
            <Button 
              variant="outline" 
              onClick={onOpenTokenDialog}
              className="justify-start"
            >
              <Key className="h-4 w-4 mr-2" />
              {t('settings.account.updateToken')}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t('settings.account.description')}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? t('settings.saving') : t('settings.saveChanges')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 