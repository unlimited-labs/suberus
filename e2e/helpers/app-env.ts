import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { baseUrlFor, dbUrlFor, fromAddrFor } from "../../playwright.config";

// In-process app code (src/env.ts) needs env, pointed at this worker's DB. A spec that
// statically imports an env-reading app module must import this first.
config({ quiet: true, path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });
const wi = Number(process.env.TEST_PARALLEL_INDEX ?? 0);
process.env.DATABASE_URL = dbUrlFor(wi);
process.env.APP_BASE_URL = baseUrlFor(wi);
process.env.SMTP_FROM_EMAIL = fromAddrFor(wi);
