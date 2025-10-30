"use client";

import { Region } from "@/lib/types";
import { TokenDialogJapan } from "./token-dialog-japan";
import { TokenDialogIntl } from "./token-dialog-intl";
import { TokenDialogIntlNew } from "./token-dialog-intl-new";

interface TokenDialogProps {
  region: Region;
  isOpen: boolean;
  onClose: () => void;
  onTokenUpdate: (token: string) => Promise<void>;
  newTokenDialog: boolean;
  startSessionPolling?: (region: "intl" | "jp", onSessionDetected?: () => void) => void;
  stopSessionPolling?: () => void;
}

export function TokenDialog({
  region,
  isOpen,
  onClose,
  onTokenUpdate,
  newTokenDialog,
  startSessionPolling,
  stopSessionPolling,
}: TokenDialogProps) {
  if (region === "jp") {
    return (
      <TokenDialogJapan
        isOpen={isOpen}
        onClose={onClose}
        onTokenUpdate={onTokenUpdate}
      />
    );
  }

  if (newTokenDialog) {
    return (
      <TokenDialogIntlNew
        isOpen={isOpen}
        onClose={onClose}
        onTokenUpdate={onTokenUpdate}
        startSessionPolling={startSessionPolling}
        stopSessionPolling={stopSessionPolling}
      />
    );
  }

  return (
    <TokenDialogIntl
      isOpen={isOpen}
      onClose={onClose}
      onTokenUpdate={onTokenUpdate}
    />
  );
} 