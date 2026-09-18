-- AlterTable
ALTER TABLE "url" ADD COLUMN     "expires_at" TIMESTAMP,
ADD COLUMN     "max_clicks" INTEGER,
ADD COLUMN     "custom_alias" BOOLEAN NOT NULL DEFAULT false;
