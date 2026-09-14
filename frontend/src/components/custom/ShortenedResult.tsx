import { useState } from "react";
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
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const code = getShortCode(shortUrl);
  const expiresLabel = expiresAt
    ? new Date(expiresAt).toLocaleString()
    : null;
  const oneTime = maxClicks === 1;

  return (
    <div className="mt-6 p-4 rounded-lg bg-secondary border border-primary/20 glow-border">
      <div className="flex items-center gap-3 flex-col sm:flex-row">
        <a
          href={shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm sm:text-lg font-semibold text-gradient font-mono flex-1 truncate hover:opacity-80 transition-opacity"
        >
          {shortUrl}
        </a>
        <div className="flex gap-3">
          <Button
            size="sm"
            variant="outline"
            className="border-primary/30 hover:bg-primary/10 hover:border-primary/50 shrink-0"
            onClick={handleCopy}
            aria-label="Copy short URL"
          >
            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
          </Button>
          <a href={shortUrl} target="_blank" rel="noopener noreferrer">
            <Button
              size="sm"
              variant="outline"
              className="border-primary/30 hover:bg-primary/10 hover:border-primary/50 shrink-0"
              aria-label="Open short URL"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
          <Button
            size="sm"
            variant="outline"
            className="border-primary/30 hover:bg-primary/10 hover:border-primary/50 shrink-0"
            onClick={() => setShowQr((value) => !value)}
            aria-label="Toggle QR code"
            aria-expanded={showQr}
          >
            <QrCode className="w-4 h-4" />
          </Button>
          <Link to={`/stats/${encodeURIComponent(code)}`}>
            <Button
              size="sm"
              variant="outline"
              className="border-primary/30 hover:bg-primary/10 hover:border-primary/50 shrink-0"
              aria-label="View statistics"
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
          </Link>
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
            <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 inline-flex items-center gap-1">
              <TimerReset className="w-3 h-3" />
              One-time link
            </span>
          )}
          {!oneTime && maxClicks && (
            <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
              {maxClicks} clicks max
            </span>
          )}
          {expiresLabel && (
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border inline-flex items-center gap-1">
              <CalendarClock className="w-3 h-3" />
              Expires {expiresLabel}
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground/70 font-mono truncate mt-5">
        Original URl: {originalUrl}
      </p>

      {showQr && <QrCodePanel key={shortUrl} url={shortUrl} />}
    </div>
  );
};
