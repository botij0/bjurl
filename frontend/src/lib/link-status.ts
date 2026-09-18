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

  const summary = expired
    ? "Expired"
    : expiresAt
      ? `Until ${formatDateTime(expiresAt)}`
      : maxClicks
        ? `Max ${maxClicks} clicks`
        : "Active";

  return {
    expired,
    oneTime: maxClicks === 1,
    consumed,
    summary,
  };
};
