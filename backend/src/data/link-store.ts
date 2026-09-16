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

export type CodeCandidates = (id: bigint) => string[];

export class LinkCodeConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LinkCodeConflictError";
  }
}

export interface LinkStore {
  findByCode(code: string): Promise<LinkRecord | null>;
  codeExists(code: string): Promise<boolean>;
  claimRedirect(code: string, now: Date): Promise<ClaimResult>;
  insertLink(input: NewLink, candidates: CodeCandidates): Promise<LinkRecord>;
  findManyByCodes(codes: string[]): Promise<LinkRecord[]>;
  totalStats(): Promise<{ urls: number; clicks: number }>;
  clicksFor(linkId: bigint): Promise<ClickRow[]>;
  recordClick(click: ClickEvent): Promise<void>;
}
