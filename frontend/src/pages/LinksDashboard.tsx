import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Link2,
  TimerReset,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/custom/AppHeader";
import { getBatchStats } from "@/api/url-client";
import { getShortCode } from "@/lib/short-code";
import { formatDateTime } from "@/lib/format";
import { linkStatus } from "@/lib/link-status";
import {
  clearLinkHistory,
  getLinkHistory,
  removeLinkFromHistory,
  type HistoryEntry,
} from "@/lib/link-history";
import type { LinkSummary } from "@/interfaces/linkStats.interface";

const CopyButton = ({ value }: { value: string }) => {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (copyState === "idle") return;

    const timeout = setTimeout(() => setCopyState("idle"), 2000);
    return () => clearTimeout(timeout);
  }, [copyState]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={handleCopy}
        aria-label="Copy short URL"
      >
        {copyState === "copied" ? (
          <Check className="w-3.5 h-3.5 text-primary" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {copyState === "copied"
          ? "Copied to clipboard"
          : copyState === "failed"
            ? "Could not copy to clipboard"
            : ""}
      </span>
    </>
  );
};

const SkeletonRows = () => (
  <div role="status">
    <span className="sr-only">Loading your links...</span>
    <ul className="space-y-3" aria-hidden>
      {[0, 1, 2].map((row) => (
        <li key={row} className="flex items-center gap-4 py-5 animate-pulse">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 max-w-full rounded bg-secondary" />
            <div className="h-3 w-72 max-w-full rounded bg-secondary" />
          </div>
          <div className="h-8 w-12 rounded bg-secondary" />
        </li>
      ))}
    </ul>
  </div>
);

export const LinksDashboard = () => {
  const [entries, setEntries] = useState<HistoryEntry[]>(getLinkHistory);
  const [summaries, setSummaries] = useState<Record<string, LinkSummary> | null>(
    null,
  );
  const [countsFailed, setCountsFailed] = useState(false);

  useEffect(() => {
    const history = getLinkHistory();
    if (history.length === 0) return;

    let active = true;
    const codes = history.map((entry) => getShortCode(entry.shortUrl));

    getBatchStats(codes).then((result) => {
      if (!active) return;

      if (!result.ok) {
        setCountsFailed(true);
        return;
      }

      const map: Record<string, LinkSummary> = {};
      for (const link of result.data) {
        map[link.shortUrl] = link;
      }

      setSummaries(map);
    });

    return () => {
      active = false;
    };
  }, []);

  const loading = entries.length > 0 && summaries === null && !countsFailed;

  const handleRemove = (shortUrl: string) => {
    setEntries(removeLinkFromHistory(shortUrl));
  };

  const handleClear = () => {
    clearLinkHistory();
    setEntries([]);
  };

  return (
    <div className="relative min-h-[100dvh]">
      <div aria-hidden className="pointer-events-none fixed inset-0 geometric-grid" />
      <AppHeader />

      <main className="relative mx-auto w-full max-w-4xl px-6 py-12">
        <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              My links
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Links created from this browser, with live click counts.
            </p>
          </div>

          {entries.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash2 className="w-4 h-4" />
              Clear history
            </Button>
          )}
        </header>

        {countsFailed && (
          <p className="text-sm text-amber-600 rounded-lg border border-amber-600/30 bg-amber-600/5 px-4 py-3 mb-6">
            Could not load click counts. The figures below are the last known
            values.
          </p>
        )}

        {loading ? (
          <SkeletonRows />
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Link2 className="w-10 h-10 text-muted-foreground" />
            <h2 className="text-xl font-semibold">No links yet</h2>
            <p className="text-sm text-muted-foreground">
              Links you shorten will appear here.
            </p>
            <Button asChild variant="outline">
              <Link to="/">Shorten a link</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => {
              const code = getShortCode(entry.shortUrl);
              const summary = summaries?.[code];
              const clicks = summary?.totalClicks;
              const status = linkStatus(
                { expiresAt: entry.expiresAt, maxClicks: entry.maxClicks },
                clicks ?? 0,
              );

              return (
                <li
                  key={entry.shortUrl}
                  className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 bg-card border border-border rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <a
                      href={entry.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm font-semibold hover:text-primary transition-colors"
                    >
                      {entry.shortUrl}
                    </a>
                    <p
                      className="text-xs text-muted-foreground truncate mt-1"
                      title={entry.originalUrl}
                    >
                      {entry.originalUrl}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span>{formatDateTime(entry.createdAt)}</span>
                      {entry.expiresAt && (
                        <span className={status.expired ? "text-destructive" : ""}>
                          {status.expired
                            ? "Expired"
                            : `Expires ${formatDateTime(entry.expiresAt)}`}
                        </span>
                      )}
                      {status.oneTime && (
                        <span className="inline-flex items-center gap-1">
                          <TimerReset className="w-3 h-3" />
                          One-time
                        </span>
                      )}
                      {entry.maxClicks !== null &&
                        entry.maxClicks > 1 &&
                        clicks !== undefined && (
                          <span>
                            {Math.min(clicks, entry.maxClicks)}/{entry.maxClicks} clicks
                          </span>
                        )}
                      {clicks !== undefined && status.consumed && !status.expired && (
                        <span className="text-destructive">Limit reached</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <div className="text-right px-3">
                      <p className="text-xl font-bold tabular-nums">
                        {summary ? summary.totalClicks : "-"}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Clicks
                      </p>
                    </div>

                    <CopyButton value={entry.shortUrl} />

                    <Button asChild size="icon-sm" variant="ghost">
                      <a
                        href={entry.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open short URL"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>

                    <Button asChild size="icon-sm" variant="ghost">
                      <Link
                        to={`/stats/${encodeURIComponent(code)}`}
                        aria-label="View statistics"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                      </Link>
                    </Button>

                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleRemove(entry.shortUrl)}
                      aria-label="Remove from history"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
};
