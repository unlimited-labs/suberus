import repl from "node:repl";
import path from "node:path";
import chalk from "chalk";

// ---------------------------------------------------------------------------
// Module registry
// ---------------------------------------------------------------------------

const MODULE_REGISTRY: Record<string, string> = {
	workflow: "@/utils/workflow.server",
	submissions: "@/utils/submissions.server",
	reviews: "@/utils/reviews.server",
	assignments: "@/utils/assignments.server",
	settings: "@/utils/settings.server",
	"admin-subs": "@/utils/admin-submissions.server",
	"admin-users": "@/utils/admin-users.server",
	email: "@/lib/server/email",
	reminders: "@/utils/reminders.server",
	dashboard: "@/utils/admin-dashboard.server",
	tracks: "@/utils/tracks.server",
	fees: "@/utils/fee.server",
	survey: "@/utils/survey.server",
	invitations: "@/utils/invitations.server",
	profiles: "@/utils/profiles.server",
};

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

type CliArgs =
	| { mode: "interactive" }
	| { mode: "exec"; expressions: string[]; preloadModules: string[] }
	| { mode: "discovery"; command: "tables" | "enums" | "modules"; }
	| { mode: "discovery"; command: "module-exports"; target: string }
	| { mode: "stdin"; preloadModules: string[] };

function parseArgs(argv: string[]): CliArgs {
	const expressions: string[] = [];
	const preloadModules: string[] = [];
	let discoveryCommand: "tables" | "enums" | "modules" | "module-exports" | null = null;
	let discoveryTarget: string | undefined;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--exec" && i + 1 < argv.length) {
			expressions.push(argv[++i]);
		} else if (arg === "--module" && i + 1 < argv.length) {
			preloadModules.push(argv[++i]);
		} else if (arg === "--tables") {
			discoveryCommand = "tables";
		} else if (arg === "--enums") {
			discoveryCommand = "enums";
		} else if (arg === "--modules") {
			discoveryCommand = "modules";
		} else if (arg === "--module-exports" && i + 1 < argv.length) {
			discoveryCommand = "module-exports";
			discoveryTarget = argv[++i];
		} else {
			process.stderr.write(`Unknown argument: ${arg}\n`);
			printUsage();
			process.exit(2);
		}
	}

	if (discoveryCommand) {
		if (discoveryCommand === "module-exports") {
			return { mode: "discovery", command: "module-exports", target: discoveryTarget! };
		}
		return { mode: "discovery", command: discoveryCommand };
	}

	if (expressions.length > 0) {
		return { mode: "exec", expressions, preloadModules };
	}

	if (!process.stdin.isTTY) {
		return { mode: "stdin", preloadModules };
	}

	return { mode: "interactive" };
}

function printUsage() {
	process.stderr.write(
		[
			"Usage: pnpm repl [options]",
			"",
			"Options:",
			"  --exec <expr>            Evaluate expression, output JSON",
			"  --module <name>          Pre-load a module before eval",
			"  --tables                 List database model names (JSON)",
			"  --enums                  List enums with values (JSON)",
			"  --modules                List loadable modules (JSON)",
			"  --module-exports <name>  List named exports of a module (JSON)",
			"",
			"No options starts interactive REPL. Piped stdin is eval'd as expression.",
			"",
		].join("\n"),
	);
}

// ---------------------------------------------------------------------------
// JSON serialization (handles BigInt, Date, functions, circular refs)
// ---------------------------------------------------------------------------

function jsonStringify(value: unknown): string {
	const seen = new WeakSet();
	return JSON.stringify(
		value,
		(_key, v) => {
			if (typeof v === "bigint") return v.toString();
			if (typeof v === "function") return `[Function: ${v.name || "anonymous"}]`;
			if (v instanceof Date) return v.toISOString();
			if (typeof v === "object" && v !== null) {
				if (seen.has(v)) return "[Circular]";
				seen.add(v);
			}
			return v;
		},
		2,
	);
}

function outputJson(data: unknown) {
	process.stdout.write(jsonStringify(data) + "\n");
}

// ---------------------------------------------------------------------------
// Core initialization (shared between modes)
// ---------------------------------------------------------------------------

interface Core {
	db: Awaited<typeof import("@/db.server.ts")>["prisma"] & Record<string, unknown>;
	enums: Record<string, unknown>;
	load: (name: string) => Promise<unknown>;
	getTableNames: () => string[];
	getEnumMap: () => Record<string, string[]>;
}

async function initCore(opts: { silent: boolean }): Promise<Core> {
	const { prisma: db } = await import("@/db.server.ts");
	const Enums = await import("../src/generated/prisma/enums.ts");

	try {
		await db.$queryRawUnsafe("SELECT 1");
		if (!opts.silent) console.log(chalk.green("\n  DB connected."));
	} catch (err) {
		if (opts.silent) {
			outputJson({ ok: false, error: `DB connection failed: ${(err as Error).message}` });
		} else {
			console.error(chalk.red("\n  Failed to connect to database:"), (err as Error).message);
		}
		process.exit(1);
	}

	const moduleCache = new Map<string, unknown>();

	async function load(name: string): Promise<unknown> {
		if (moduleCache.has(name)) return moduleCache.get(name);
		const modulePath = MODULE_REGISTRY[name];
		if (!modulePath) return undefined;
		const mod = await import(modulePath);
		moduleCache.set(name, mod);
		return mod;
	}

	function getTableNames(): string[] {
		return Object.keys(db)
			.filter((k) => !k.startsWith("$") && !k.startsWith("_") && k !== "constructor")
			.sort();
	}

	function getEnumMap(): Record<string, string[]> {
		const result: Record<string, string[]> = {};
		for (const [name, values] of Object.entries(Enums)) {
			if (typeof values === "object" && values !== null && !Array.isArray(values)) {
				result[name] = Object.keys(values as Record<string, unknown>);
			}
		}
		return result;
	}

	return { db: db as Core["db"], enums: Enums, load, getTableNames, getEnumMap };
}

// ---------------------------------------------------------------------------
// Discovery mode
// ---------------------------------------------------------------------------

async function runDiscovery(core: Core, command: string, target?: string) {
	switch (command) {
		case "tables":
			outputJson({ tables: core.getTableNames() });
			break;
		case "enums":
			outputJson({ enums: core.getEnumMap() });
			break;
		case "modules":
			outputJson({ modules: MODULE_REGISTRY });
			break;
		case "module-exports": {
			if (!target || !MODULE_REGISTRY[target]) {
				outputJson({ ok: false, error: `Unknown module: "${target}". Available: ${Object.keys(MODULE_REGISTRY).join(", ")}` });
				process.exit(1);
			}
			const mod = await core.load(target);
			const exports = Object.keys(mod as Record<string, unknown>).filter((k) => k !== "default");
			outputJson({ module: target, exports });
			break;
		}
	}
}

// ---------------------------------------------------------------------------
// Expression evaluation (non-interactive)
// ---------------------------------------------------------------------------

// biome-ignore lint/complexity/noBannedTypes: AsyncFunction constructor requires Function type
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (...args: string[]) => Function;

async function runExec(core: Core, expressions: string[], preloadModules: string[]) {
	// Build eval context
	const context: Record<string, unknown> = { db: core.db, load: core.load };

	// Spread enums
	for (const [key, value] of Object.entries(core.enums)) {
		if (typeof value === "object" && value !== null) {
			context[key] = value;
		}
	}

	// Pre-load requested modules
	for (const name of preloadModules) {
		if (!MODULE_REGISTRY[name]) {
			outputJson({ ok: false, error: `Unknown module: "${name}". Available: ${Object.keys(MODULE_REGISTRY).join(", ")}` });
			process.exit(1);
		}
		const mod = await core.load(name);
		for (const [key, value] of Object.entries(mod as Record<string, unknown>)) {
			if (key !== "default") context[key] = value;
		}
	}

	const contextKeys = Object.keys(context);
	const contextValues = Object.values(context);

	for (const expression of expressions) {
		try {
			const isMultiStatement = expression.includes(";");
			const body = isMultiStatement ? expression : `return (${expression})`;
			const fn = new AsyncFunction(...contextKeys, body);
			const result = await fn(...contextValues);
			outputJson({ ok: true, result: result === undefined ? null : result });
		} catch (err) {
			process.stderr.write((err as Error).stack ?? (err as Error).message);
			process.stderr.write("\n");
			outputJson({ ok: false, error: (err as Error).message });
			process.exit(1);
		}
	}
}

// ---------------------------------------------------------------------------
// Stdin reader
// ---------------------------------------------------------------------------

async function readStdin(): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
	return Buffer.concat(chunks).toString("utf-8").trim();
}

// ---------------------------------------------------------------------------
// Interactive REPL
// ---------------------------------------------------------------------------

function printBanner() {
	console.log(chalk.cyan.bold("\n  Suberus REPL"));
	console.log(chalk.dim("  ─".repeat(24)));
	console.log();
	console.log(chalk.white("  Context:"));
	console.log(`    ${chalk.green("db")}             Prisma client (db.user, db.submission, ...)`);
	console.log(`    ${chalk.green("<Enum>")}         SubmissionStatus, UserRole, ... (spread)`);
	console.log(`    ${chalk.green("load(name)")}     Load server module: ${chalk.dim("await load('workflow')")}`);
	console.log();
	console.log(chalk.white("  Commands:"));
	console.log(`    ${chalk.yellow(".tables")}        List database models`);
	console.log(`    ${chalk.yellow(".enums")}         List enums with values`);
	console.log(`    ${chalk.yellow(".modules")}       List loadable modules`);
	console.log();
}

async function runInteractive(core: Core) {
	const interactiveLoad = async (name: string): Promise<unknown> => {
		if (!MODULE_REGISTRY[name]) {
			console.error(chalk.red(`Unknown module "${name}". Use .modules to see available modules.`));
			return undefined;
		}
		const mod = await core.load(name);
		if (mod) {
			const exports = Object.keys(mod as Record<string, unknown>).filter((k) => k !== "default");
			console.log(chalk.dim(`Loaded ${name}: ${exports.join(", ")}`));
		}
		return mod;
	};

	printBanner();

	const server = repl.start({
		prompt: chalk.cyan("suberus") + chalk.dim("> "),
		useColors: true,
		preview: true,
	});

	server.context.db = core.db;
	server.context.load = interactiveLoad;
	server.context.chalk = chalk;

	for (const [key, value] of Object.entries(core.enums)) {
		if (typeof value === "object" && value !== null) {
			server.context[key] = value;
		}
	}

	server.defineCommand("tables", {
		help: "List all Prisma model names",
		action() {
			console.log(chalk.cyan("\nAvailable models:"));
			for (const m of core.getTableNames()) {
				console.log(`  db.${m}`);
			}
			console.log();
			this.displayPrompt();
		},
	});

	server.defineCommand("enums", {
		help: "List all enums with values",
		action() {
			console.log(chalk.cyan("\nAvailable enums:"));
			for (const [name, values] of Object.entries(core.getEnumMap())) {
				console.log(`  ${chalk.yellow(name)}: ${values.join(", ")}`);
			}
			console.log();
			this.displayPrompt();
		},
	});

	server.defineCommand("modules", {
		help: "List available modules for load()",
		action() {
			console.log(chalk.cyan("\nLoadable modules:"));
			for (const [shortname, importPath] of Object.entries(MODULE_REGISTRY)) {
				console.log(`  ${chalk.green(shortname.padEnd(14))} ${chalk.dim(importPath)}`);
			}
			console.log();
			this.displayPrompt();
		},
	});

	const historyPath = path.join(process.cwd(), ".repl_history");
	server.setupHistory(historyPath, (err) => {
		if (err) console.error(chalk.dim("History unavailable:"), err.message);
	});

	server.on("exit", async () => {
		console.log(chalk.dim("\nDisconnecting..."));
		await core.db.$disconnect();
		process.exit(0);
	});
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const args = parseArgs(process.argv.slice(2));

	// --modules doesn't need DB connection
	if (args.mode === "discovery" && args.command === "modules") {
		outputJson({ modules: MODULE_REGISTRY });
		process.exit(0);
	}

	const silent = args.mode !== "interactive";
	const core = await initCore({ silent });

	switch (args.mode) {
		case "discovery":
			await runDiscovery(core, args.command, "target" in args ? args.target : undefined);
			break;
		case "exec":
			await runExec(core, args.expressions, args.preloadModules);
			break;
		case "stdin":
			await runExec(core, [await readStdin()], args.preloadModules);
			break;
		case "interactive":
			await runInteractive(core);
			return; // don't disconnect — REPL handles exit
	}

	await core.db.$disconnect();
}

main().catch((err) => {
	const silent = !process.stdin.isTTY || process.argv.slice(2).length > 0;
	if (silent) {
		outputJson({ ok: false, error: (err as Error).message });
	} else {
		console.error(chalk.red("REPL failed to start:"), (err as Error).message);
	}
	process.exit(1);
});
