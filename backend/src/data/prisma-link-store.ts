import { PrismaClient } from "../generated/prisma/client";
import { prisma } from "./postgres";
import {
  LinkCodeConflictError,
  type ClaimResult,
  type ClickEvent,
  type ClickRow,
  type CodeCandidates,
  type LinkRecord,
  type LinkStore,
  type NewLink,
} from "./link-store";

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: unknown }).code === "P2002";

export class PrismaLinkStore implements LinkStore {
  constructor(private readonly client: PrismaClient = prisma) {}

  public async findByCode(code: string): Promise<LinkRecord | null> {
    return this.client.url.findUnique({ where: { short_url: code } });
  }

  public async codeExists(code: string): Promise<boolean> {
    const existing = await this.client.url.findUnique({
      where: { short_url: code },
      select: { id: true },
    });

    return existing !== null;
  }

  public async claimRedirect(code: string, now: Date): Promise<ClaimResult> {
    const link = await this.client.url.findUnique({
      where: { short_url: code },
    });

    if (!link) return { ok: false, reason: "not_found" };

    const where: {
      id: bigint;
      expires_at?: { gt: Date };
      counter?: { lt: number };
    } = { id: link.id };

    if (link.expires_at) where.expires_at = { gt: now };
    if (link.max_clicks !== null) where.counter = { lt: link.max_clicks };

    const updated = await this.client.url.updateMany({
      where,
      data: { counter: { increment: 1 } },
    });

    if (updated.count === 0) return { ok: false, reason: "gone" };

    return { ok: true, link: { ...link, counter: link.counter + 1 } };
  }

  public async insertLink(
    input: NewLink,
    candidates: CodeCandidates,
  ): Promise<LinkRecord> {
    return this.client.$transaction(async (tx) => {
      const record = await tx.url.create({
        data: {
          long_url: input.long_url,
          custom_alias: input.custom_alias,
          expires_at: input.expires_at,
          max_clicks: input.max_clicks,
        },
      });

      for (const candidate of candidates(record.id)) {
        try {
          return await tx.url.update({
            where: { id: record.id },
            data: { short_url: candidate },
          });
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
        }
      }

      throw new LinkCodeConflictError(
        `Every candidate code for link ${record.id} is already in use`,
      );
    });
  }

  public async findManyByCodes(codes: string[]): Promise<LinkRecord[]> {
    return this.client.url.findMany({ where: { short_url: { in: codes } } });
  }

  public async totalStats(): Promise<{ urls: number; clicks: number }> {
    const urls = await this.client.url.count();
    const clicks = await this.client.click.count();

    return { urls, clicks };
  }

  public async clickCountsFor(
    linkIds: bigint[],
  ): Promise<{ url_id: bigint; count: number }[]> {
    const rows = await this.client.click.groupBy({
      by: ["url_id"],
      where: { url_id: { in: linkIds } },
      _count: { _all: true },
    });

    return rows.map((row) => ({ url_id: row.url_id, count: row._count._all }));
  }

  public async clicksFor(linkId: bigint): Promise<ClickRow[]> {
    return this.client.click.findMany({
      where: { url_id: linkId },
      select: {
        referrer: true,
        user_agent: true,
        ip_hash: true,
        country: true,
        clicked_at: true,
      },
    });
  }

  public async recordClick(click: ClickEvent): Promise<void> {
    await this.client.click.create({
      data: {
        url_id: click.url_id,
        referrer: click.referrer,
        user_agent: click.user_agent,
        ip_hash: click.ip_hash,
        country: click.country,
      },
    });
  }
}

export const prismaLinkStore = new PrismaLinkStore();
