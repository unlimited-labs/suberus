-- better-auth 1.7 binds every account to the issuer that minted it.
-- Backfill uses the synthetic local issuer the library derives for providers
-- without one of their own (createLocalAccountIssuer); this instance only ever
-- created "credential" accounts, so no OAuth namespace is needed.
ALTER TABLE "accounts" ADD COLUMN "issuer" TEXT;

UPDATE "accounts" SET "issuer" = 'local:' || "providerId" WHERE "issuer" IS NULL;

ALTER TABLE "accounts" ALTER COLUMN "issuer" SET NOT NULL;

CREATE UNIQUE INDEX "accounts_issuer_accountId_key" ON "accounts"("issuer", "accountId");
