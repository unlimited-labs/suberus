import { execSync, spawn } from "child_process";
import { existsSync, statSync, readdirSync, openSync, writeFileSync, mkdirSync, appendFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import pg from "pg";
import {
	E2E_WORKERS,
	E2E_OUTPUT_DIR,
	PG_BASE,
	dbNameFor,
	dbUrlFor,
	envFor,
	baseUrlFor,
	fromAddrFor,
} from "../../playwright.config";
import { killPids } from "./server-control";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

config({ quiet: true, path: resolve(PROJECT_ROOT, ".env.local") });

const OUTPUT_DIR = resolve(PROJECT_ROOT, E2E_OUTPUT_DIR);
const OUTPUT_SERVER = resolve(OUTPUT_DIR, "server/index.mjs");
const LOG_DIR = resolve(PROJECT_ROOT, "e2e/.server-logs");
export const PIDS_FILE = resolve(PROJECT_ROOT, "e2e/.server-pids.json");

/** Newest mtime (ms) across a directory tree, skipping build/vendor dirs. */
function newestMtime(dir: string): number {
	let newest = 0;
	const skip = new Set(["node_modules", ".output", E2E_OUTPUT_DIR, ".git", ".nitro", "dist"]);
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

// Inputs whose change should invalidate the build (not just src/).
const BUILD_INPUTS = [
	"src",
	"prisma/schema.prisma",
	"package.json",
	"playwright.config.ts",
	"vite.config.ts",
	"src/features/auth/server/auth.server.ts",
].map((p) => resolve(PROJECT_ROOT, p));

function newestInputMtime(): number {
	let newest = 0;
	for (const p of BUILD_INPUTS) {
		if (!existsSync(p)) continue;
		const st = statSync(p);
		newest = Math.max(newest, st.isDirectory() ? newestMtime(p) : st.mtimeMs);
	}
	return newest;
}

/** Rebuild the production output if forced, missing, or older than any build input. */
function buildIfStale() {
	const fresh =
		!process.env.E2E_FORCE_BUILD &&
		existsSync(OUTPUT_SERVER) &&
		statSync(OUTPUT_SERVER).mtimeMs >= newestInputMtime();
	if (fresh) {
		console.log("✅ Build up to date, skipping");
		return;
	}
	console.log(`🔄 Building app into ${E2E_OUTPUT_DIR} (stale, missing, or E2E_FORCE_BUILD)...`);
	execSync("pnpm build", {
		cwd: PROJECT_ROOT,
		stdio: "inherit",
		env: { ...process.env, BUILD_OUTPUT_DIR: E2E_OUTPUT_DIR },
	});
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

/** Poll the server until it returns a 2xx, or fail fast if it exits / times out. */
async function waitForServer(url: string, exitCode: () => number | null, timeoutMs = 120_000) {
	const start = Date.now();
	let last = "no response";
	while (Date.now() - start < timeoutMs) {
		const code = exitCode();
		if (code !== null) throw new Error(`Server ${url} exited (code ${code}) during startup`);
		try {
			const res = await fetch(url);
			if (res.ok) return;
			last = `HTTP ${res.status}`;
		} catch {
			last = "connection refused";
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error(`Server at ${url} not ready within ${timeoutMs}ms (last: ${last})`);
}

async function globalSetup() {
	buildIfStale();
	mkdirSync(LOG_DIR, { recursive: true });

	const pids: number[] = [];

	// DB must be migrated + seeded before its server boots (the server queries on
	// startup), so prepare and spawn per worker in sequence. On any failure, kill
	// whatever we already spawned so nothing is orphaned on the e2e ports.
	try {
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
			const child = spawn("node", ["--env-file=.env", `${E2E_OUTPUT_DIR}/server/index.mjs`], {
				cwd: PROJECT_ROOT,
				env: { ...process.env, ...envFor(i) },
				stdio: ["ignore", logFd, logFd],
			});
			let exitCode: number | null = null;
			child.on("exit", (c, sig) => {
				exitCode = c ?? 0;
				appendFileSync(
					join(LOG_DIR, `worker-${i}.log`),
					`[global-setup] server process exited code=${c} signal=${sig} at ${new Date().toISOString()}\n`,
				);
			});
			if (child.pid) {
				pids.push(child.pid);
				// Persist incrementally so teardown can stop servers even if a later
				// worker's setup throws.
				writeFileSync(PIDS_FILE, JSON.stringify(pids));
			}
			await waitForServer(baseUrlFor(i), () => exitCode);
			console.log(`✅ [worker ${i}] Database ${dbName} + server ready`);
		}
	} catch (err) {
		await killPids(pids);
		throw err;
	}

	// Shared Mailpit/S3 are intentionally NOT wiped (would destroy dev mail/files);
	// E2E mail is scoped per worker by from-address, S3 keys by unique submission id.

	console.log(`✅ Global setup complete (${E2E_WORKERS} isolated worker DB(s) + server(s))`);
}

export default globalSetup;
