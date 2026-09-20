import { toast } from "sonner";
import { Link2, ArrowRight, Loader2 } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createShortUrl } from "@/api/url-client";
import { addLinkToHistory } from "@/lib/link-history";
import { aliasReasonMessage, useAliasCheck } from "@/lib/alias";
import { getExpiresAt, type ExpiryOption } from "@/lib/link-options";
import { LinkOptionsPanel } from "./LinkOptionsPanel";
import { ShortenedResult } from "./ShortenedResult";
import type { urlResponse } from "@/interfaces/urlResponse.interface";

const isValidUrl = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
};

export const UrlShortenerForm = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<urlResponse | null>(null);
  const [error, setError] = useState("");

  const [showOptions, setShowOptions] = useState(false);
  const [customAlias, setCustomAlias] = useState("");
  const [expiry, setExpiry] = useState<ExpiryOption>("never");
  const [oneTime, setOneTime] = useState(false);
  const { outcome } = useAliasCheck(customAlias);

  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  const handleAliasChange = (value: string) => {
    setCustomAlias(value);
    setError("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    handleShortenUrl();
  };

  const handleShortenUrl = async () => {
    if (submittingRef.current) return;

    const url = inputRef.current?.value;

    if (!url?.trim()) {
      setError("Please enter a URL.");
      return;
    }

    if (!isValidUrl(url)) {
      setError("Please enter a valid URL (e.g. https://example.com).");
      return;
    }

    const alias = customAlias.trim();
    if (alias && outcome.state === "unavailable") {
      setError(aliasReasonMessage(outcome.reason));
      return;
    }

    submittingRef.current = true;
    setError("");
    setLoading(true);

    try {
      const response = await createShortUrl(url.trim(), {
        customAlias: alias || undefined,
        expiresAt: getExpiresAt(expiry),
        maxClicks: oneTime ? 1 : undefined,
      });

      if (!response.ok) {
        if (response.kind === "refused") {
          setError(aliasReasonMessage(response.reason));
          return;
        }

        toast.error(response.error, { position: "top-center" });
        return;
      }

      setResult(response.data);
      addLinkToHistory(response.data);
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1 space-y-1.5">
          <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Paste your long URL here..."
            ref={inputRef}
            onKeyDown={handleKeyDown}
            onChange={() => setError("")}
            className="pl-12 h-14 bg-card border-border text-foreground placeholder:text-muted-foreground font-mono text-sm rounded-lg"
          />
        </div>

        <Button
          onClick={handleShortenUrl}
          disabled={loading}
          className="h-14 px-8 rounded-lg active:translate-y-px"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Shorten
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      <LinkOptionsPanel
        open={showOptions}
        onToggle={() => setShowOptions((value) => !value)}
        customAlias={customAlias}
        onCustomAliasChange={handleAliasChange}
        outcome={outcome}
        expiry={expiry}
        onExpiryChange={setExpiry}
        oneTime={oneTime}
        onOneTimeChange={setOneTime}
      />

      {error && (
        <p className="text-sm text-destructive font-medium mt-2" role="alert">
          {error}
        </p>
      )}
      {result && <ShortenedResult {...result} />}
    </div>
  );
};
