-- CreateTable
CREATE TABLE "click" (
    "id" BIGSERIAL NOT NULL,
    "url_id" BIGINT NOT NULL,
    "clicked_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" VARCHAR,
    "user_agent" VARCHAR,
    "ip_hash" VARCHAR,
    "country" VARCHAR(2),

    CONSTRAINT "click_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "click_url_id_clicked_at_idx" ON "click"("url_id", "clicked_at");

-- AddForeignKey
ALTER TABLE "click" ADD CONSTRAINT "click_url_id_fkey" FOREIGN KEY ("url_id") REFERENCES "url"("id") ON DELETE CASCADE ON UPDATE CASCADE;
