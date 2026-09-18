import { formatDateTime } from "@/lib/format";

export interface LinkStatus {
  expired: boolean;
  oneTime: boolean;
  consumed: boolean;
  summary: string;
}

export const linkStatus = (
  link: { expiresAt?: string | null; maxClicks?: number | null },
  clicks: number,
  now: Date = new Date(),
): LinkStatus => {
  const expiresAt = link.expiresAt ?? null;
  const maxClicks = link.maxClicks ?? null;

  const expired = Boolean(
    expiresAt && new Date(expiresAt).getTime() <= now.getTime(),
  );
  const consumed = maxClicks !== null && clicks >= maxClicks;

  const clauses: string[] = [];
  if (expiresAt) clauses.push(`Until ${formatDateTime(expiresAt)}`);
  if (maxClicks !== null) clauses.push(`Max ${maxClicks} clicks`);

  const summary = expired
    ? "Expired"
    : clauses.length > 0
      ? clauses.join(" · ")
      : "Active";

  return {
    expired,
    oneTime: maxClicks === 1,
    consumed,
    summary,
  };
};
