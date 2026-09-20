import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CalendarClock,
  ExternalLink,
  Globe,
  MonitorSmartphone,
  MousePointerClick,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/custom/AppHeader";
import { getLinkStats } from "@/api/url-client";
import { getShortCode } from "@/lib/short-code";
import { formatDateTime } from "@/lib/format";
import { linkStatus } from "@/lib/link-status";
import { getLinkHistory, type HistoryEntry } from "@/lib/link-history";
import type { LinkStats } from "@/interfaces/linkStats.interface";
import type { UrlOutcome } from "@/api/url-client";

interface BreakdownItem {
  label: string;
  count: number;
}

const StatItem = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) => (
  <div className="border-l-2 border-border pl-4 py-1">
    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
      {icon}
      {label}
    </div>
    <p className="text-2xl md:text-3xl font-bold tabular-nums mt-1.5 truncate" title={String(value)}>
      {value}
    </p>
  </div>
);

const BreakdownList = ({
  title,
  icon,
  items,
  emptyLabel,
}: {
  title: string;
  icon: ReactNode;
  items: BreakdownItem[];
  emptyLabel: string;
}) => {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="p-5 rounded-xl bg-card border border-border">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </h2>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-4">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.label}>
              <div className="flex justify-between gap-4 text-sm">
                <span className="truncate font-mono" title={item.label}>
                  {item.label}
                </span>
                <span className="text-muted-foreground tabular-nums">{item.count}</span>
              </div>
              <div className="h-1 mt-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const LoadingSkeleton = () => (
  <div role="status">
    <span className="sr-only">Loading analytics...</span>
    <div className="animate-pulse" aria-hidden>
      <div className="h-9 w-56 rounded bg-secondary" />
      <div className="mt-3 h-4 w-72 max-w-full rounded bg-secondary" />
      <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="space-y-2">
            <div className="h-3 w-20 rounded bg-secondary" />
            <div className="h-8 w-16 rounded bg-secondary" />
          </div>
        ))}
      </div>
      <div className="mt-10 h-72 rounded-xl bg-secondary" />
    </div>
  </div>
);

export const LinkStatsPage = () => {
  const { shortUrl = "" } = useParams();
  const [result, setResult] = useState<{
    code: string;
    outcome: UrlOutcome<LinkStats>;
  } | null>(null);
  const historyEntry = useMemo<HistoryEntry | null>(
    () =>
      getLinkHistory().find(
        (entry) => getShortCode(entry.shortUrl) === shortUrl,
      ) ?? null,
    [shortUrl],
  );

  useEffect(() => {
    let active = true;

    getLinkStats(shortUrl).then((outcome) => {
      if (!active) return;
      setResult({ code: shortUrl, outcome });
    });

    return () => {
      active = false;
    };
  }, [shortUrl]);

  const outcome = result?.code === shortUrl ? result.outcome : null;
  const stats = outcome?.ok ? outcome.data : null;
  const failed = outcome !== null && !outcome.ok && outcome.kind === "error";
  const status = linkStatus(
    { expiresAt: stats?.expiresAt, maxClicks: stats?.maxClicks },
    stats?.totalClicks ?? 0,
  );

  const shortLink = historyEntry?.shortUrl ?? `/${shortUrl}`;

  return (
    <div className="relative min-h-dvh">
      <div aria-hidden className="pointer-events-none fixed inset-0 geometric-grid" />
      <AppHeader />

      <main className="relative mx-auto w-full max-w-5xl px-6 py-12">
        {outcome === null ? (
          <LoadingSkeleton />
        ) : failed ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <h1 className="text-2xl font-bold">Could not load analytics</h1>
            <p className="text-sm text-muted-foreground max-w-md">
              The link itself may work fine. This is only the analytics page
              failing to load.
            </p>
            <Link to={`/stats/${encodeURIComponent(shortUrl)}`} reloadDocument>
              <Button variant="outline">Try again</Button>
            </Link>
          </div>
        ) : !stats ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <h1 className="text-2xl font-bold">Link not found</h1>
            <p className="text-sm text-muted-foreground font-mono">
              {shortUrl}
            </p>
            <Link to="/">
              <Button variant="outline">Shorten a new link</Button>
            </Link>
          </div>
        ) : (
          <>
            <header className="mb-10">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Link analytics
              </h1>
              <div className="flex flex-col gap-1 mt-3 text-sm font-mono text-muted-foreground">
                <a
                  href={shortLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline w-fit"
                >
                  {shortLink}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="truncate max-w-2xl" title={stats.originalUrl}>
                  {stats.originalUrl}
                </span>
              </div>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
              <StatItem
                label="Total clicks"
                value={stats.totalClicks}
                icon={<MousePointerClick className="w-3.5 h-3.5" />}
              />
              <StatItem
                label="Unique visitors"
                value={stats.uniqueClicks}
                icon={<Users className="w-3.5 h-3.5" />}
              />
              <StatItem
                label="Created"
                value={formatDateTime(stats.createdAt)}
                icon={<CalendarClock className="w-3.5 h-3.5" />}
              />
              <StatItem
                label="Status"
                value={status.summary}
                icon={<Activity className="w-3.5 h-3.5" />}
              />
            </div>

            <div className="mt-10 p-5 rounded-xl bg-card border border-border">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Clicks over time
              </h2>
              <div className="h-64 mt-4">
                {stats.clicksByDay.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No clicks yet. Share your link to see data here.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={stats.clicksByDay.map((item) => ({
                        ...item,
                        label: item.date.slice(5),
                      }))}
                    >
                      <defs>
                        <linearGradient id="clicksFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: "var(--border)" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: "var(--border)" }}
                        width={32}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          color: "var(--foreground)",
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "var(--muted-foreground)" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Clicks"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        fill="url(#clicksFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mt-6">
              <BreakdownList
                title="Top referrers"
                icon={<Globe className="w-3.5 h-3.5" />}
                items={stats.topReferrers.map((item) => ({
                  label: item.referrer,
                  count: item.count,
                }))}
                emptyLabel="No referrer data yet."
              />
              <BreakdownList
                title="Devices"
                icon={<MonitorSmartphone className="w-3.5 h-3.5" />}
                items={stats.topDevices.map((item) => ({
                  label: item.device,
                  count: item.count,
                }))}
                emptyLabel="No device data yet."
              />
              <BreakdownList
                title="Countries"
                icon={<Globe className="w-3.5 h-3.5" />}
                items={stats.topCountries.map((item) => ({
                  label: item.country,
                  count: item.count,
                }))}
                emptyLabel="No country data yet."
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
};
