import { toast } from "sonner";
import { Link2, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createShortUrl } from "@/actions/create-short-url.action";
import { checkAlias, type AliasAvailability } from "@/actions/check-alias.action";
import { addLinkToHistory } from "@/lib/link-history";
import {
  getAliasErrorMessage,
  getExpiresAt,
  type ExpiryOption,
} from "@/lib/link-options";
import { LinkOptionsPanel } from "./LinkOptionsPanel";
import { ShortenedResult } from "./ShortenedResult";
import type { urlResponse } from "@/interfaces/urlResponse.interface";

const ALIAS_DEBOUNCE_MS = 400;

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
  const [checkingAlias, setCheckingAlias] = useState(false);
  const [aliasAvailability, setAliasAvailability] =
    useState<AliasAvailability | null>(null);
  const [expiry, setExpiry] = useState<ExpiryOption>("never");
  const [oneTime, setOneTime] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const alias = customAlias.trim();
    if (!alias) return;

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      const availability = await checkAlias(alias, controller.signal);
      setAliasAvailability(availability);
      setCheckingAlias(false);
    }, ALIAS_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [customAlias]);

  const handleAliasChange = (value: string) => {
    setCustomAlias(value);
    setError("");

    if (!value.trim()) {
      setAliasAvailability(null);
      setCheckingAlias(false);
      return;
    }

    setCheckingAlias(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    handleShortenUrl();
  };

  const handleShortenUrl = async () => {
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
    if (alias) {
      const aliasError = getAliasErrorMessage(aliasAvailability);
      if (aliasError) {
        setError(aliasError);
        return;
      }
    }

    setError("");
    setLoading(true);

    const response = await createShortUrl(url.trim(), {
      customAlias: alias || undefined,
      expiresAt: getExpiresAt(expiry),
      maxClicks: oneTime ? 1 : undefined,
    });

    setLoading(false);

    if (!response.ok) {
      if (response.status === 409) {
        setError(response.error);
        return;
      }

      toast.error(response.error, { position: "top-center" });
      return;
    }

    setResult(response.data);
    addLinkToHistory(response.data);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1 space-y-1.5">
          <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Paste your long URL here..."
            ref={inputRef}
            onKeyDown={handleKeyDown}
            onChange={() => setError("")}
            className="pl-12 h-14 bg-secondary border-primary/50 text-foreground placeholder:text-muted-foreground font-mono text-sm focus-visible:ring-primary/50 focus-visible:border-primary/80 rounded-lg"
          />
        </div>

        <Button
          onClick={handleShortenUrl}
          className="h-14 px-8 glow-border border dark:border-accent/30 transition-all duration-300 dark:text-secondary-foreground dark:bg-background"
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
        checkingAlias={checkingAlias}
        availability={aliasAvailability}
        expiry={expiry}
        onExpiryChange={setExpiry}
        oneTime={oneTime}
        onOneTimeChange={setOneTime}
      />

      {error && (
        <p className="text-sm text-red-500 font-medium mt-2" role="alert">
          {error}
        </p>
      )}
      {result && <ShortenedResult {...result} />}
    </div>
  );
};
