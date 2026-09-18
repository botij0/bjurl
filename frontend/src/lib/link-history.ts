import type { urlResponse } from "@/interfaces/urlResponse.interface";

const STORAGE_KEY = "bjurl:links";
const MAX_ENTRIES = 100;

export interface HistoryEntry {
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
  expiresAt: string | null;
  maxClicks: number | null;
}

export const getLinkHistory = (): HistoryEntry[] => {
  if (typeof localStorage === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
};

const save = (entries: HistoryEntry[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const addLinkToHistory = (link: urlResponse): HistoryEntry[] => {
  const entry: HistoryEntry = {
    shortUrl: link.shortUrl,
    originalUrl: link.originalUrl,
    createdAt: new Date().toISOString(),
    expiresAt: link.expiresAt ?? null,
    maxClicks: link.maxClicks ?? null,
  };

  const entries = [
    entry,
    ...getLinkHistory().filter((item) => item.shortUrl !== entry.shortUrl),
  ].slice(0, MAX_ENTRIES);

  save(entries);
  return entries;
};

export const removeLinkFromHistory = (shortUrl: string): HistoryEntry[] => {
  const entries = getLinkHistory().filter((item) => item.shortUrl !== shortUrl);
  save(entries);
  return entries;
};

export const clearLinkHistory = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
