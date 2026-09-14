import { useEffect, useState, type ReactNode } from "react";
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
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  Globe,
  Loader2,
  MonitorSmartphone,
  MousePointerClick,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/custom/ThemeToggle";
import { getLinkStats } from "@/actions/get-link-stats.action";
import { getShortCode } from "@/lib/short-code";
import { formatDateTime, isExpired } from "@/lib/format";
import { getLinkHistory } from "@/lib/link-history";
import type { LinkStats } from "@/interfaces/linkStats.interface";

interface BreakdownItem {
  label: string;
  count: number;
}

const StatCard = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) => (
  <div className="p-5 rounded-xl bg-card border border-primary/15">
    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
      {icon}
      {label}
    </div>
    <p className="text-3xl font-bold text-gradient mt-2 truncate" title={String(value)}>
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
    <div className="p-5 rounded-xl bg-card border border-primary/15">
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
                <span className="text-muted-foreground">{item.count}</span>
              </div>
              <div className="h-1.5 mt-1 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-linear-to-r from-primary to-accent"
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

export const LinkStatsPage = () => {
  const { shortUrl = "" } = useParams();
  const [result, setResult] = useState<{
    code: string;
    stats: LinkStats | null;
  } | null>(null);

  useEffect(() => {
    let active = true;

    getLinkStats(shortUrl).then((data) => {
      if (!active) return;
      setResult({ code: shortUrl, stats: data });
    });

    return () => {
      active = false;
    };
  }, [shortUrl]);

  const loading = result?.code !== shortUrl;
  const stats = result?.code === shortUrl ? result.stats : null;

  const historyEntry = getLinkHistory().find(
    (entry) => getShortCode(entry.shortUrl) === shortUrl,
  );
  const shortLink = historyEntry?.shortUrl ?? `/${shortUrl}`;

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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Loading analytics...</p>
          </div>
        ) : !stats ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
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
            <header className="mt-8 mb-8">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Link <span className="text-gradient">analytics</span>
              </h1>
              <div className="flex flex-col gap-1 mt-3 text-sm font-mono text-muted-foreground">
                <a
                  href={shortLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:opacity-80 w-fit"
                >
                  {shortLink}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="truncate max-w-2xl" title={stats.originalUrl}>
                  {stats.originalUrl}
                </span>
              </div>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total clicks"
                value={stats.totalClicks}
                icon={<MousePointerClick className="w-3.5 h-3.5" />}
              />
              <StatCard
                label="Unique visitors"
                value={stats.uniqueClicks}
                icon={<Users className="w-3.5 h-3.5" />}
              />
              <StatCard
                label="Created"
                value={formatDateTime(stats.createdAt)}
                icon={<CalendarClock className="w-3.5 h-3.5" />}
              />
              <StatCard
                label="Status"
                value={
                  isExpired(stats.expiresAt)
                    ? "Expired"
                    : stats.expiresAt
                      ? `Until ${formatDateTime(stats.expiresAt)}`
                      : stats.maxClicks
                        ? `Max ${stats.maxClicks} clicks`
                        : "Active"
                }
                icon={<CalendarClock className="w-3.5 h-3.5" />}
              />
            </div>

            <div className="mt-6 p-5 rounded-xl bg-card border border-primary/15">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Clicks over time
              </h2>
              <div className="h-64 mt-4">
                {stats.clicksByDay.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No clicks yet — share your link to see data here.
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
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.05} />
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
      </div>
    </div>
  );
};
