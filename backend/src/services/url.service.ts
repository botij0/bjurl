import type { PrismaClient } from "@prisma/client/extension";
import { encodeBase62 } from "../config/encode";
import { prisma } from "../data/postgres";

export class UrlService {
  constructor() {}

  public async getLongUrl(shortUrl: string) {
    try {
      return await prisma.url.update({
        where: { short_url: shortUrl },
        data: { counter: { increment: 1 } },
      });
    } catch (error) {
      return null;
    }
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
