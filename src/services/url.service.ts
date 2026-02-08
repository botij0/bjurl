import { encodeBase62 } from "../config/encode";
import { prisma } from "../data/postgres";

export class UrlService {
  constructor() {}

  public async getLongUrl(shortUrl: string) {
    return await prisma.url.findFirst({
      where: { short_url: shortUrl },
    });
  }

  public async createShortUrl(longUrl: string) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const created = await tx.url.create({
          data: {
            long_url: longUrl,
          },
        });

        const shortUrl = encodeBase62(created.id);

        const updated = await tx.url.update({
          where: { id: created.id },
          data: { short_url: shortUrl },
        });

        return updated;
      });

      return result;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }
}
