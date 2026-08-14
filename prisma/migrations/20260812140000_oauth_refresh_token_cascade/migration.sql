-- The refresh token belongs to the user it was issued for, so it must die with
-- them. RESTRICT (Prisma's default for a required relation) made any user who
-- had connected an MCP client undeletable, and checkUserDeletable never
-- reported it, so the admin UI offered a delete that failed with a raw FK error.
ALTER TABLE "oauth_refresh_tokens" DROP CONSTRAINT "oauth_refresh_tokens_userId_fkey";

ALTER TABLE "oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
