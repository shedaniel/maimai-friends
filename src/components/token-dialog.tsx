"use client";

import { Region } from "@/lib/types";
import { TokenDialogJapan } from "./token-dialog-japan";
import { TokenDialogIntl } from "./token-dialog-intl";

interface TokenDialogProps {
  region: Region;
  isOpen: boolean;
  onClose: () => void;
  onTokenUpdate: (token: string) => Promise<void>;
}

export function TokenDialog({
  region,
  isOpen,
  onClose,
  onTokenUpdate,
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

  return (
    <TokenDialogIntl
      isOpen={isOpen}
      onClose={onClose}
      onTokenUpdate={onTokenUpdate}
    />
  );
} 