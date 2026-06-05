import { execSync, spawn } from "child_process";
import { existsSync, statSync, readdirSync, openSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import pg from "pg";
import {
	E2E_WORKERS,
	PG_BASE,
	dbNameFor,
	dbUrlFor,
	envFor,
	baseUrlFor,
	fromAddrFor,
} from "../../playwright.config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

config({ quiet: true, path: resolve(PROJECT_ROOT, ".env.local") });

const OUTPUT_SERVER = resolve(PROJECT_ROOT, ".output/server/index.mjs");
const LOG_DIR = resolve(PROJECT_ROOT, "e2e/.server-logs");
export const PIDS_FILE = resolve(PROJECT_ROOT, "e2e/.server-pids.json");

/** Newest mtime (ms) across a directory tree, skipping build/vendor dirs. */
function newestMtime(dir: string): number {
	let newest = 0;
	const skip = new Set(["node_modules", ".output", ".git", ".nitro", "dist"]);
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith(".") && entry.isDirectory()) continue;
		if (skip.has(entry.name)) continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			newest = Math.max(newest, newestMtime(full));
		} else {
			newest = Math.max(newest, statSync(full).mtimeMs);
		}
	}
	return newest;
}

/** Rebuild the production output if missing or older than the newest source file. */
function buildIfStale() {
	const fresh =
		existsSync(OUTPUT_SERVER) &&
		statSync(OUTPUT_SERVER).mtimeMs >= newestMtime(resolve(PROJECT_ROOT, "src"));
	if (fresh) {
		console.log("✅ Build up to date, skipping");
		return;
	}
	console.log("🔄 Building app (.output stale or missing)...");
	execSync("pnpm build", { cwd: PROJECT_ROOT, stdio: "inherit" });
	console.log("✅ Build complete");
}

/** Drop + recreate a worker's isolated database (separate from dev `suberus`). */
async function recreateDatabase(name: string) {
	const admin = new pg.Client({ connectionString: `${PG_BASE}/suberus` });
	await admin.connect();
	try {
		await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
		await admin.query(`CREATE DATABASE "${name}"`);
	} finally {
		await admin.end();
	}
}

/** Poll the server URL until it responds (any HTTP status) or times out. */
async function waitForServer(url: string, timeoutMs = 120_000) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		try {
			await fetch(url);
			return;
		} catch {
			// server not listening yet
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function globalSetup() {
	buildIfStale();
	mkdirSync(LOG_DIR, { recursive: true });

	const pids: number[] = [];

	// DB must be migrated + seeded before its server boots (the server queries on
	// startup), so prepare and spawn per worker in sequence.
	for (let i = 0; i < E2E_WORKERS; i++) {
		const dbName = dbNameFor(i);
		const dbUrl = dbUrlFor(i);

		console.log(`🔄 [worker ${i}] Recreating database ${dbName}...`);
		await recreateDatabase(dbName);

		console.log(`🔄 [worker ${i}] Applying migrations to ${dbName}...`);
		execSync("pnpm exec prisma migrate reset --force", {
			cwd: PROJECT_ROOT,
			stdio: "pipe",
			env: {
				...process.env,
				DATABASE_URL: dbUrl,
				PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "yes",
			},
		});

		console.log(`🌱 [worker ${i}] Seeding ${dbName}...`);
		execSync("pnpm exec tsx e2e/setup/seed.ts", {
			cwd: PROJECT_ROOT,
			stdio: "inherit",
			env: { ...process.env, DATABASE_URL: dbUrl, SMTP_FROM_EMAIL: fromAddrFor(i) },
		});

		console.log(`🚀 [worker ${i}] Starting server on ${baseUrlFor(i)}...`);
		const logFd = openSync(join(LOG_DIR, `worker-${i}.log`), "w");
		const child = spawn(
			"node",
			["--env-file=.env", ".output/server/index.mjs"],
			{
				cwd: PROJECT_ROOT,
				env: { ...process.env, ...envFor(i) },
				stdio: ["ignore", logFd, logFd],
			},
		);
		if (child.pid) pids.push(child.pid);
		await waitForServer(baseUrlFor(i));
		console.log(`✅ [worker ${i}] Database ${dbName} + server ready`);
	}

	writeFileSync(PIDS_FILE, JSON.stringify(pids));

	// Shared Mailpit/S3 are intentionally NOT wiped (would destroy dev mail/files);
	// E2E mail is scoped per worker by from-address, S3 keys by unique submission id.

	console.log(`✅ Global setup complete (${E2E_WORKERS} isolated worker DB(s) + server(s))`);
}

export default globalSetup;
