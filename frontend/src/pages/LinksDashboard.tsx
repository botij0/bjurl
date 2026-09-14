import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  TimerReset,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/custom/ThemeToggle";
import { getBatchStats } from "@/actions/get-batch-stats.action";
import { getShortCode } from "@/lib/short-code";
import { formatDateTime, isExpired } from "@/lib/format";
import {
  clearLinkHistory,
  getLinkHistory,
  removeLinkFromHistory,
  type HistoryEntry,
} from "@/lib/link-history";
import type { LinkSummary } from "@/interfaces/linkStats.interface";

const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={handleCopy}
      aria-label="Copy short URL"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
};

export const LinksDashboard = () => {
  const [entries, setEntries] = useState<HistoryEntry[]>(getLinkHistory);
  const [summaries, setSummaries] = useState<Record<string, LinkSummary> | null>(
    null,
  );

  useEffect(() => {
    const history = getLinkHistory();
    if (history.length === 0) return;

    let active = true;
    const codes = history.map((entry) => getShortCode(entry.shortUrl));

    getBatchStats(codes).then((links) => {
      if (!active) return;

      const map: Record<string, LinkSummary> = {};
      for (const link of links) {
        map[link.shortUrl] = link;
      }

      setSummaries(map);
    });

    return () => {
      active = false;
    };
  }, []);

  const loading = entries.length > 0 && summaries === null;

  const handleRemove = (shortUrl: string) => {
    setEntries(removeLinkFromHistory(shortUrl));
  };

  const handleClear = () => {
    clearLinkHistory();
    setEntries([]);
  };

  return (
    <div className="min-h-screen px-6 py-10 geometric-grid">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to shortener
          </Link>
          <ThemeToggle />
        </div>

        <header className="flex flex-wrap items-end justify-between gap-4 mt-8 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              My <span className="text-gradient">links</span>
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Loading your links...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <Link2 className="w-10 h-10 text-muted-foreground" />
            <h2 className="text-xl font-semibold">No links yet</h2>
            <p className="text-sm text-muted-foreground">
              Links you shorten will appear here.
            </p>
            <Link to="/">
              <Button variant="outline">Shorten a link</Button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => {
              const code = getShortCode(entry.shortUrl);
              const summary = summaries?.[code];
              const expired = isExpired(entry.expiresAt);
              const consumed =
                entry.maxClicks !== null &&
                (summary?.totalClicks ?? 0) >= entry.maxClicks;

              return (
                <li
                  key={entry.shortUrl}
                  className="p-4 rounded-xl bg-card border border-primary/15 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <a
                      href={entry.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm font-semibold text-gradient hover:opacity-80"
                    >
                      {entry.shortUrl}
                    </a>
                    <p
                      className="text-xs text-muted-foreground truncate mt-1"
                      title={entry.originalUrl}
                    >
                      {entry.originalUrl}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{formatDateTime(entry.createdAt)}</span>
                      {entry.expiresAt && (
                        <span className={expired ? "text-red-500" : ""}>
                          {expired ? "Expired" : `Expires ${formatDateTime(entry.expiresAt)}`}
                        </span>
                      )}
                      {entry.maxClicks === 1 && (
                        <span className="inline-flex items-center gap-1 text-accent">
                          <TimerReset className="w-3 h-3" />
                          One-time
                        </span>
                      )}
                      {entry.maxClicks !== null && entry.maxClicks > 1 && (
                        <span>
                          {Math.min(summary?.totalClicks ?? 0, entry.maxClicks)}/{entry.maxClicks} clicks
                        </span>
                      )}
                      {consumed && !expired && (
                        <span className="text-red-500">Limit reached</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <div className="text-center px-3">
                      <p className="text-xl font-bold text-gradient">
                        {summary ? summary.totalClicks : "—"}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Clicks
                      </p>
                    </div>

                    <CopyButton value={entry.shortUrl} />

                    <a href={entry.shortUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="icon-sm" variant="ghost" aria-label="Open short URL">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>

                    <Link to={`/stats/${encodeURIComponent(code)}`}>
                      <Button size="icon-sm" variant="ghost" aria-label="View statistics">
                        <BarChart3 className="w-3.5 h-3.5" />
                      </Button>
                    </Link>

                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleRemove(entry.shortUrl)}
                      aria-label="Remove from history"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
