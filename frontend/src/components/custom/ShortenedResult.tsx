import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { urlResponse } from "@/interfaces/urlResponse.interface";


export const ShortenedResult = ({ shortUrl, originalUrl }: urlResponse) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          >
            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
          </Button>
          <a href={shortUrl} target="_blank" rel="noopener noreferrer">
            <Button
              size="sm"
              variant="outline"
              className="border-primary/30 hover:bg-primary/10 hover:border-primary/50 shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </div>
      <p className="text-xs text-muted-foreground/70 font-mono truncate mt-5">
        Original URl: {originalUrl}
      </p>
    </div>
  );
};
