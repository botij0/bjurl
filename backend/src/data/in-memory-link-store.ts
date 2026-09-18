import {
  LinkCodeConflictError,
  summarizeClicks,
  type ClaimResult,
  type ClickEvent,
  type ClickRow,
  type CodeCandidates,
  type LinkRecord,
  type LinkStatsAggregate,
  type LinkStore,
  type NewLink,
} from "./link-store";

export class InMemoryLinkStore implements LinkStore {
  private readonly links: LinkRecord[] = [];
  private readonly clicks: (ClickRow & { url_id: bigint })[] = [];
  private nextId = 1n;

  public async findByCode(code: string): Promise<LinkRecord | null> {
    return this.links.find((link) => link.short_url === code) ?? null;
  }

  public async codeExists(code: string): Promise<boolean> {
    return this.links.some((link) => link.short_url === code);
  }

  public async claimRedirect(code: string, now: Date): Promise<ClaimResult> {
    const link = this.links.find((row) => row.short_url === code);

    if (!link) return { ok: false, reason: "not_found" };

    if (link.expires_at && link.expires_at.getTime() <= now.getTime()) {
      return { ok: false, reason: "gone" };
    }

    if (link.max_clicks !== null && link.counter >= link.max_clicks) {
      return { ok: false, reason: "gone" };
    }

    link.counter += 1;
    return { ok: true, link: { ...link } };
  }

  public async insertLink(
    input: NewLink,
    candidates: CodeCandidates,
  ): Promise<LinkRecord> {
    const id = this.nextId++;
    const used = new Set(this.links.map((link) => link.short_url));
    const code = candidates(id).find((candidate) => !used.has(candidate));

    if (!code) {
      throw new LinkCodeConflictError(
        `Every candidate code for link ${id} is already in use`,
      );
    }

    const link: LinkRecord = {
      id,
      long_url: input.long_url,
      short_url: code,
      counter: 0,
      created_at: new Date(),
      expires_at: input.expires_at ?? null,
      max_clicks: input.max_clicks ?? null,
      custom_alias: input.custom_alias ?? false,
    };

    this.links.push(link);
    return link;
  }

  public async findManyByCodes(codes: string[]): Promise<LinkRecord[]> {
    const wanted = new Set(codes);
    return this.links.filter(
      (link) => link.short_url !== null && wanted.has(link.short_url),
    );
  }

  public async totalStats(): Promise<{ urls: number; clicks: number }> {
    return { urls: this.links.length, clicks: this.clicks.length };
  }

  public async clickCountsFor(
    linkIds: bigint[],
  ): Promise<{ url_id: bigint; count: number }[]> {
    return [...new Set(linkIds)]
      .map((id) => ({
        url_id: id,
        count: this.clicks.filter((click) => click.url_id === id).length,
      }))
      .filter((entry) => entry.count > 0);
  }

  public async clicksFor(linkId: bigint): Promise<ClickRow[]> {
    return this.clicks
      .filter((click) => click.url_id === linkId)
      .map(({ url_id, ...row }) => row);
  }

  public async linkStatsFor(linkId: bigint): Promise<LinkStatsAggregate> {
    const rows = this.clicks.filter((click) => click.url_id === linkId);

    const byDay = new Map<string, number>();
    const byReferrer = new Map<string | null, number>();
    const byUserAgent = new Map<string | null, number>();
    const byCountry = new Map<string | null, number>();
    const unique = new Set<string>();

    for (const click of rows) {
      const day = click.clicked_at.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
      byReferrer.set(
        click.referrer,
        (byReferrer.get(click.referrer) ?? 0) + 1,
      );
      byUserAgent.set(
        click.user_agent,
        (byUserAgent.get(click.user_agent) ?? 0) + 1,
      );
      byCountry.set(click.country, (byCountry.get(click.country) ?? 0) + 1);
      if (click.ip_hash) unique.add(click.ip_hash);
    }

    return summarizeClicks({
      totalClicks: rows.length,
      uniqueClicks: unique.size,
      dayCounts: [...byDay.entries()].map(([date, count]) => ({ date, count })),
      referrerCounts: [...byReferrer.entries()].map(([referrer, count]) => ({
        referrer,
        count,
      })),
      userAgentCounts: [...byUserAgent.entries()].map(
        ([user_agent, count]) => ({ user_agent, count }),
      ),
      countryCounts: [...byCountry.entries()].map(([country, count]) => ({
        country,
        count,
      })),
    });
  }

  public async recordClick(click: ClickEvent): Promise<void> {
    this.clicks.push({
      url_id: click.url_id,
      referrer: click.referrer ?? null,
      user_agent: click.user_agent ?? null,
      ip_hash: click.ip_hash ?? null,
      country: click.country ?? null,
      clicked_at: new Date(),
    });
  }

  public seedClick(click: ClickRow & { url_id: bigint }): void {
    this.clicks.push({ ...click });
  }
}
