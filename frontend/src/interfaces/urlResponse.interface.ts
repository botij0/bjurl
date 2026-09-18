export interface urlResponse {
  originalUrl: string;
  shortUrl: string;
  expiresAt?: string | null;
  maxClicks?: number | null;
  customAlias?: boolean;
}
