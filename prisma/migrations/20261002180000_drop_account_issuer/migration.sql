-- better-auth 1.7.3 reverted the 1.7.0-1.7.2 issuer schema and no longer writes it.
DROP INDEX "accounts_issuer_accountId_key";

ALTER TABLE "accounts" DROP COLUMN "issuer";
