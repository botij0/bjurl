export interface LinkStats {
  shortUrl: string;
  originalUrl: string;
  totalClicks: number;
  uniqueClicks: number;
  createdAt: string;
  expiresAt: string | null;
  maxClicks: number | null;
  clicksByDay: { date: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  topDevices: { device: string; count: number }[];
  topCountries: { country: string; count: number }[];
}

export interface LinkSummary {
  shortUrl: string;
  originalUrl: string;
  totalClicks: number;
  createdAt: string;
  expiresAt: string | null;
  maxClicks: number | null;
}
