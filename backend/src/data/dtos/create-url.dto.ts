export class CreateUrlDto {
  private constructor(
    public readonly long_url: string,
    public readonly custom_alias?: string,
    public readonly expires_at?: Date,
    public readonly max_clicks?: number,
  ) {}

  static create(props: { [key: string]: any }): [string?, CreateUrlDto?] {
    const { longUrl, customAlias, expiresAt, maxClicks } = props;

    if (!longUrl || typeof longUrl !== "string") {
      return ["Long Url is required", undefined];
    }

    try {
      new URL(longUrl);
    } catch {
      return ["Please provide a valid URL (e.g. https://example.com)", undefined];
    }

    if (
      customAlias !== undefined &&
      customAlias !== null &&
      customAlias !== "" &&
      typeof customAlias !== "string"
    ) {
      return ["Custom alias must be a string", undefined];
    }

    const alias: string | undefined = customAlias || undefined;

    let expires: Date | undefined;
    if (expiresAt !== undefined && expiresAt !== null && expiresAt !== "") {
      if (typeof expiresAt !== "string") {
        return ["Expiration date must be a valid ISO date", undefined];
      }

      const parsed = new Date(expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        return ["Expiration date must be a valid ISO date", undefined];
      }

      if (parsed.getTime() <= Date.now()) {
        return ["Expiration date must be in the future", undefined];
      }

      expires = parsed;
    }

    let maxClicksValue: number | undefined;
    if (maxClicks !== undefined && maxClicks !== null && maxClicks !== "") {
      const parsed = typeof maxClicks === "number" ? maxClicks : Number(maxClicks);
      if (!Number.isInteger(parsed) || parsed < 1) {
        return ["Max clicks must be a positive integer", undefined];
      }

      maxClicksValue = parsed;
    }

    return [
      undefined,
      new CreateUrlDto(longUrl.trim(), alias, expires, maxClicksValue),
    ];
  }
}
