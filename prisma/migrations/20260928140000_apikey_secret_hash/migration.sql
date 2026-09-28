-- API key secret hashing: stop storing raw bearer tokens.
-- New code writes keyHash (SHA-256 hex) + keyHint and looks keys up by hash.
-- Legacy rows are backfilled by scripts/backfill-apikey-hashes.ts, then a
-- follow-up migration drops the plaintext `key` column.

-- AlterTable
ALTER TABLE "workspace_api_keys" ADD COLUMN "keyHash" TEXT,
ADD COLUMN "keyHint" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "workspace_api_keys_keyHash_key" ON "workspace_api_keys"("keyHash");
