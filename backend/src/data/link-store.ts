export interface LinkRecord {
  id: bigint;
  long_url: string;
  short_url: string | null;
  counter: number;
  created_at: Date;
  expires_at: Date | null;
  max_clicks: number | null;
  custom_alias: boolean;
}

export interface NewLink {
  long_url: string;
  expires_at?: Date;
  max_clicks?: number;
  custom_alias?: boolean;
}

export interface ClickEvent {
  url_id: bigint;
  referrer?: string;
  user_agent?: string;
  ip_hash?: string;
  country?: string;
}

export interface ClickRow {
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  country: string | null;
  clicked_at: Date;
}

export type ClaimResult =
  | { ok: true; link: LinkRecord }
  | { ok: false; reason: "not_found" | "gone" };

export interface LinkStatsAggregate {
  totalClicks: number;
  uniqueClicks: number;
  clicksByDay: { date: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  topDevices: { device: string; count: number }[];
  topCountries: { country: string; count: number }[];
}

export interface ClickGroupCounts {
  totalClicks: number;
  uniqueClicks: number;
  dayCounts: { date: string; count: number }[];
  referrerCounts: { referrer: string | null; count: number }[];
  userAgentCounts: { user_agent: string | null; count: number }[];
  countryCounts: { country: string | null; count: number }[];
}

export type CodeCandidates = (id: bigint) => string[];

export class LinkCodeConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LinkCodeConflictError";
  }
}

const STATS_TOP_ITEMS = 5;

const classifyDevice = (userAgent: string | null | undefined): string => {
  if (!userAgent) return "unknown";

  const ua = userAgent.toLowerCase();
  if (/bot|crawl|spider|slurp|facebookexternalhit|preview/.test(ua)) return "bot";
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod/.test(ua)) return "mobile";
  return "desktop";
};

const topEntries = (counts: Map<string, number>): [string, number][] =>
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, STATS_TOP_ITEMS);

export const summarizeClicks = (
  groups: ClickGroupCounts,
): LinkStatsAggregate => {
  const byReferrer = new Map<string, number>();
  for (const { referrer, count } of groups.referrerCounts) {
    const key = referrer?.trim() || "direct";
    byReferrer.set(key, (byReferrer.get(key) ?? 0) + count);
  }

  const byDevice = new Map<string, number>();
  for (const { user_agent, count } of groups.userAgentCounts) {
    const device = classifyDevice(user_agent);
    byDevice.set(device, (byDevice.get(device) ?? 0) + count);
  }

  const byCountry = new Map<string, number>();
  for (const { country, count } of groups.countryCounts) {
    if (country) byCountry.set(country, (byCountry.get(country) ?? 0) + count);
  }

  return {
    totalClicks: groups.totalClicks,
    uniqueClicks: groups.uniqueClicks,
    clicksByDay: [...groups.dayCounts].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    topReferrers: topEntries(byReferrer).map(([referrer, count]) => ({
      referrer,
      count,
    })),
    topDevices: topEntries(byDevice).map(([device, count]) => ({
      device,
      count,
    })),
    topCountries: topEntries(byCountry).map(([country, count]) => ({
      country,
      count,
    })),
  };
};

export interface LinkStore {
  findByCode(code: string): Promise<LinkRecord | null>;
  codeExists(code: string): Promise<boolean>;
  claimRedirect(code: string, now: Date): Promise<ClaimResult>;
  insertLink(input: NewLink, candidates: CodeCandidates): Promise<LinkRecord>;
  findManyByCodes(codes: string[]): Promise<LinkRecord[]>;
  totalStats(): Promise<{ urls: number; clicks: number }>;
  clickCountsFor(linkIds: bigint[]): Promise<{ url_id: bigint; count: number }[]>;
  clicksFor(linkId: bigint): Promise<ClickRow[]>;
  linkStatsFor(linkId: bigint): Promise<LinkStatsAggregate>;
  recordClick(click: ClickEvent): Promise<void>;
}
