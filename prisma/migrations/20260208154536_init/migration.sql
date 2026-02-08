-- CreateTable
CREATE TABLE "url" (
    "id" BIGSERIAL NOT NULL,
    "long_url" VARCHAR NOT NULL,
    "short_url" VARCHAR,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "url_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "url_short_url_key" ON "url"("short_url");
