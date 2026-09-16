export type ExpiryOption = "never" | "1h" | "24h" | "7d" | "30d";

export const EXPIRY_OPTIONS: {
  value: ExpiryOption;
  label: string;
  ms: number | null;
}[] = [
  { value: "never", label: "Never expires", ms: null },
  { value: "1h", label: "1 hour", ms: 60 * 60 * 1000 },
  { value: "24h", label: "24 hours", ms: 24 * 60 * 60 * 1000 },
  { value: "7d", label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { value: "30d", label: "30 days", ms: 30 * 24 * 60 * 60 * 1000 },
];

export const getExpiresAt = (option: ExpiryOption): string | undefined => {
  const ms = EXPIRY_OPTIONS.find((item) => item.value === option)?.ms;
  if (!ms) return undefined;
  return new Date(Date.now() + ms).toISOString();
};
