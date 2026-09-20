import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  BarChart3,
  CalendarClock,
  Check,
  Copy,
  ExternalLink,
  QrCode,
  TimerReset,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { linkStatus } from "@/lib/link-status";
import { getShortCode } from "@/lib/short-code";
import { QrCodePanel } from "./QrCodePanel";
import type { urlResponse } from "@/interfaces/urlResponse.interface";

export const ShortenedResult = ({
  shortUrl,
  originalUrl,
  expiresAt,
  maxClicks,
  customAlias,
}: urlResponse) => {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (copyState === "idle") return;

    const timeout = setTimeout(() => setCopyState("idle"), 2000);
    return () => clearTimeout(timeout);
  }, [copyState]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const code = getShortCode(shortUrl);
  const status = linkStatus({ expiresAt, maxClicks }, 0);
  const expiresLabel = expiresAt ? formatDateTime(expiresAt) : null;
  const oneTime = status.oneTime;

  return (
    <div className="mt-6 p-5 rounded-xl bg-card border border-border animate-enter">
      <div className="flex items-center gap-3 flex-col sm:flex-row">
        <a
          href={shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm sm:text-base font-semibold font-mono flex-1 truncate hover:text-primary transition-colors"
        >
          {shortUrl}
        </a>
        <div className="flex gap-2">
          <Button
            size="icon-sm"
            variant="outline"
            className="shrink-0"
            onClick={handleCopy}
            aria-label="Copy short URL"
          >
            {copyState === "copied" ? (
              <Check className="w-4 h-4 text-primary" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
          <span role="status" aria-live="polite" className="sr-only">
            {copyState === "copied"
              ? "Copied to clipboard"
              : copyState === "failed"
                ? "Could not copy to clipboard"
                : ""}
          </span>
          <Button
            asChild
            size="icon-sm"
            variant="outline"
            className="shrink-0"
          >
            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open short URL"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            className="shrink-0"
            onClick={() => setShowQr((value) => !value)}
            aria-label="Toggle QR code"
            aria-expanded={showQr}
          >
            <QrCode className="w-4 h-4" />
          </Button>
          <Button
            asChild
            size="icon-sm"
            variant="outline"
            className="shrink-0"
          >
            <Link
              to={`/stats/${encodeURIComponent(code)}`}
              aria-label="View statistics"
            >
              <BarChart3 className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>

      {(customAlias || oneTime || maxClicks || expiresLabel) && (
        <div className="flex flex-wrap gap-2 mt-4">
          {customAlias && (
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              Custom alias
            </span>
          )}
          {oneTime && (
            <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground border border-border inline-flex items-center gap-1">
              <TimerReset className="w-3 h-3" />
              One-time link
            </span>
          )}
          {!oneTime && maxClicks && (
            <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground border border-border">
              {maxClicks} clicks max
            </span>
          )}
          {expiresLabel && (
            <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground border border-border inline-flex items-center gap-1">
              <CalendarClock className="w-3 h-3" />
              Expires {expiresLabel}
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground font-mono truncate mt-4">
        Original URL: {originalUrl}
      </p>

      {showQr && <QrCodePanel key={shortUrl} url={shortUrl} />}
    </div>
  );
};
