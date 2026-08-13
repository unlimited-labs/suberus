import repl from "node:repl";
import path from "node:path";
import chalk from "chalk";
import { consola } from "consola";

const MODULE_REGISTRY: Record<string, string> = {
	workflow: "@/features/workflow/server/workflow",
	submissions: "@/features/submissions/server/submissions",
	reviews: "@/features/reviews/server/reviews",
	assignments: "@/features/reviews/server/assignments",
	settings: "@/features/settings/server/settings",
	conference: "@/features/settings/server/conference",
	"admin-subs": "@/features/submissions/server/admin-submissions",
	todo: "@/features/submissions/server/conference-todo",
	activity: "@/features/activity-log/server/query",
	"create-for-user": "@/features/submissions/server/create-for-user",
	"upload-target": "@/features/submissions/server/upload-target",
	"admin-users": "@/features/users/server/users",
	email: "@/shared/server/email",
	reminders: "@/features/submissions/server/reminders",
	dashboard: "@/features/dashboard/server/admin-dashboard",
	tracks: "@/features/tracks/server/tracks",
	"admin-tracks": "@/features/tracks/server/admin-tracks",
	fees: "@/features/fee/server/fee",
	survey: "@/features/survey/server/survey",
	extraction: "@/features/extraction/server/extraction",
	planner: "@/features/planner/server/schedule",
	invitations: "@/features/invitations/server/invitations",
	profiles: "@/features/profile/server/profile",
};

const DEFAULT_TIMEOUT_MS = 30_000;

type CliArgs =
	| { mode: "interactive" }
	| { mode: "help" }
	| { mode: "exec"; expressions: string[]; preloadModules: string[]; raw: boolean; timeout: number }
	| { mode: "discovery"; command: "tables" | "enums" | "modules" }
	| { mode: "discovery"; command: "module-exports"; target: string }
	| { mode: "discovery"; command: "schema"; target?: string }
	| { mode: "stdin"; preloadModules: string[]; raw: boolean; timeout: number };

function parseArgs(argv: string[]): CliArgs {
	const expressions: string[] = [];
	const preloadModules: string[] = [];
	let discoveryCommand: "tables" | "enums" | "modules" | "module-exports" | "schema" | null = null;
	let discoveryTarget: string | undefined;
	let raw = false;
	let timeout = DEFAULT_TIMEOUT_MS;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--help" || arg === "-h") {
			return { mode: "help" };
		} else if (arg === "--exec" && i + 1 < argv.length) {
			expressions.push(argv[++i]);
		} else if (arg === "--module" && i + 1 < argv.length) {
			preloadModules.push(argv[++i]);
		} else if (arg === "--raw") {
			raw = true;
		} else if (arg === "--timeout" && i + 1 < argv.length) {
			timeout = Number.parseInt(argv[++i], 10);
			if (Number.isNaN(timeout) || timeout <= 0) {
				consola.error("--timeout must be a positive integer (ms)");
				process.exit(2);
			}
		} else if (arg === "--tables") {
			discoveryCommand = "tables";
		} else if (arg === "--enums") {
			discoveryCommand = "enums";
		} else if (arg === "--modules") {
			discoveryCommand = "modules";
		} else if (arg === "--module-exports" && i + 1 < argv.length) {
			discoveryCommand = "module-exports";
			discoveryTarget = argv[++i];
		} else if (arg === "--schema") {
			discoveryCommand = "schema";
			// optional target — peek next arg
			if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
				discoveryTarget = argv[++i];
			}
		} else {
			consola.error(`Unknown argument: ${arg}`);
			printUsage();
			process.exit(2);
		}
	}

	if (discoveryCommand) {
		if (discoveryCommand === "module-exports") {
			return { mode: "discovery", command: "module-exports", target: discoveryTarget! };
		}
		if (discoveryCommand === "schema") {
			return { mode: "discovery", command: "schema", target: discoveryTarget };
		}
		return { mode: "discovery", command: discoveryCommand };
	}

	if (expressions.length > 0) {
		return { mode: "exec", expressions, preloadModules, raw, timeout };
	}

	if (!process.stdin.isTTY) {
		return { mode: "stdin", preloadModules, raw, timeout };
	}

	return { mode: "interactive" };
}

function printUsage() {
	process.stderr.write(
		[
			"Usage: pnpm repl [options]",
			"",
			"Modes:",
			"  (no args)                Interactive REPL with DB, enums, and module loading",
			"  --exec <expr>            Evaluate JS expression, output JSON (repeatable)",
			"  stdin pipe               Piped input is eval'd as expression",
			"",
			"Discovery:",
			"  --tables                 List database model names",
			"  --enums                  List enums with values",
			"  --modules                List loadable server modules",
			"  --module-exports <name>  List named exports of a module",
			"  --schema [model]         Show model fields/types/relations (all if omitted)",
			"",
			"Modifiers:",
			"  --module <name>          Pre-load module, spread exports into context (repeatable)",
			"  --raw                    Output bare result without { ok, result } wrapper",
			`  --timeout <ms>           Eval timeout (default: ${DEFAULT_TIMEOUT_MS}ms)`,
			"  --help, -h               Show this help",
			"",
			"Context available in expressions:",
			"  db                       Prisma client (db.user, db.submission, ...)",
			"  load(name)               Load a server module by name",
			"  $                        Shared object persisting across batch --exec",
			"  <Enum>                   SubmissionStatus, UserRole, ... (spread)",
			"",
			"Examples:",
			'  pnpm repl --exec "await db.user.count()"',
			'  pnpm repl --exec "$.u = await db.user.findFirst()" --exec "$.u.email"',
			'  pnpm repl --module workflow --exec "Object.keys(await load(\'workflow\'))"',
			"  pnpm repl --schema user",
			"  pnpm repl --schema",
			'  pnpm repl --raw --exec "await db.user.findMany()"',
			'  pnpm repl --timeout 5000 --exec "await db.user.findMany()"',
			'  echo "await db.user.count()" | pnpm repl',
			"",
			"Output (non-interactive):",
			'  Single --exec:   { "ok": true, "result": <value> }',
			'  Multiple --exec: [{ "ok": true, "result": ... }, ...]',
			"  --raw:           bare result value (no wrapper)",
			'  Error:           { "ok": false, "error": "<message>" }',
			"",
		].join("\n"),
	);
}

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

interface Core {
	db: Awaited<typeof import("@/shared/server/db.server.ts")>["prisma"] & Record<string, unknown>;
	enums: Record<string, unknown>;
	load: (name: string) => Promise<unknown>;
	getTableNames: () => string[];
	getEnumMap: () => Record<string, string[]>;
	getModelSchema: (name: string) => ModelSchema | undefined;
	getAllModelSchemas: () => Record<string, ModelSchema>;
}

interface ModelSchema {
	model: string;
	dbName: string | null;
	fields: Array<{
		name: string;
		type: string;
		kind: string;
		isList?: true;
		isId?: true;
		isUnique?: true;
		hasDefaultValue?: true;
		isRequired?: true;
		isUpdatedAt?: true;
		relation?: { name: string; from: string[]; to: string[] };
	}>;
}

type RuntimeDataModel = {
	models: Record<string, { fields: Array<Record<string, unknown>>; dbName: string | null }>;
};

async function initCore(opts: { silent: boolean }): Promise<Core> {
	const { prisma: db } = await import("@/shared/server/db.server.ts");
	const Enums = await import("../src/generated/prisma/enums.ts");

	try {
		await db.$queryRawUnsafe("SELECT 1");
		if (!opts.silent) consola.success("DB connected");
	} catch (err) {
		if (opts.silent) {
			outputJson({ ok: false, error: `DB connection failed: ${(err as Error).message}` });
		} else {
			consola.error("Failed to connect to database:", (err as Error).message);
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

	function buildModelSchema(modelName: string, model: RuntimeDataModel["models"][string]): ModelSchema {
		const fields: ModelSchema["fields"] = model.fields.map((f) => {
			const field: ModelSchema["fields"][number] = {
				name: f.name as string,
				type: f.type as string,
				kind: f.kind as string,
			};
			if (f.isList) field.isList = true;
			if (f.isId) field.isId = true;
			if (f.isUnique) field.isUnique = true;
			if (f.hasDefaultValue) field.hasDefaultValue = true;
			if (f.isRequired) field.isRequired = true;
			if (f.isUpdatedAt) field.isUpdatedAt = true;
			if (f.kind === "object" && f.relationName) {
				field.relation = {
					name: f.relationName as string,
					from: (f.relationFromFields as string[]) ?? [],
					to: (f.relationToFields as string[]) ?? [],
				};
			}
			return field;
		});
		return { model: modelName, dbName: model.dbName, fields };
	}

	function getRuntimeDataModel(): RuntimeDataModel {
		return (db as unknown as { _runtimeDataModel: RuntimeDataModel })._runtimeDataModel;
	}

	function getModelSchema(name: string): ModelSchema | undefined {
		const rdm = getRuntimeDataModel();
		const modelEntry = Object.entries(rdm.models).find(
			([k]) => k.toLowerCase() === name.toLowerCase(),
		);
		if (!modelEntry) return undefined;
		return buildModelSchema(modelEntry[0], modelEntry[1]);
	}

	function getAllModelSchemas(): Record<string, ModelSchema> {
		const rdm = getRuntimeDataModel();
		const result: Record<string, ModelSchema> = {};
		for (const [modelName, model] of Object.entries(rdm.models)) {
			result[modelName] = buildModelSchema(modelName, model);
		}
		return result;
	}

	return { db: db as Core["db"], enums: Enums, load, getTableNames, getEnumMap, getModelSchema, getAllModelSchemas };
}

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
		case "schema": {
			if (target) {
				const schema = core.getModelSchema(target);
				if (!schema) {
					outputJson({ ok: false, error: `Unknown model: "${target}". Available: ${core.getTableNames().join(", ")}` });
					process.exit(1);
				}
				outputJson(schema);
			} else {
				outputJson({ models: core.getAllModelSchemas() });
			}
			break;
		}
	}
}

// biome-ignore lint/complexity/noBannedTypes: AsyncFunction constructor requires Function type
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (...args: string[]) => Function;

async function evalWithTimeout(fn: () => Promise<unknown>, timeoutMs: number): Promise<unknown> {
	let timer: ReturnType<typeof setTimeout>;
	try {
		return await Promise.race([
			fn(),
			new Promise<never>((_resolve, reject) => {
				timer = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
			}),
		]);
	} finally {
		clearTimeout(timer!);
	}
}

async function runExec(core: Core, expressions: string[], preloadModules: string[], raw: boolean, timeoutMs: number) {
	const shared: Record<string, unknown> = {};
	const context: Record<string, unknown> = { db: core.db, load: core.load, $: shared };

	for (const [key, value] of Object.entries(core.enums)) {
		if (typeof value === "object" && value !== null) {
			context[key] = value;
		}
	}

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

	const results: Array<{ ok: true; result: unknown } | { ok: false; error: string }> = [];

	for (const expression of expressions) {
		try {
			const body = `return (${expression})`;
			const fn = new AsyncFunction(...contextKeys, body);
			const result = await evalWithTimeout(() => fn(...contextValues), timeoutMs);
			results.push({ ok: true, result: result === undefined ? null : result });
		} catch (err) {
			consola.error((err as Error).stack ?? (err as Error).message);
			results.push({ ok: false, error: (err as Error).message });
		}
	}

	// Single expression: unwrap from array
	const output = expressions.length === 1 ? results[0] : results;

	if (raw) {
		if (expressions.length === 1) {
			const r = results[0];
			if (r.ok) {
				outputJson(r.result);
			} else {
				outputJson({ error: r.error });
				process.exit(1);
			}
		} else {
			outputJson(results.map((r) => (r.ok ? r.result : { error: r.error })));
			if (results.some((r) => !r.ok)) process.exit(1);
		}
	} else {
		outputJson(output);
		if (Array.isArray(output) ? output.some((r) => !r.ok) : !output.ok) process.exit(1);
	}
}

async function readStdin(): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
	return Buffer.concat(chunks).toString("utf-8").trim();
}

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
			consola.error(`Unknown module "${name}". Use .modules to see available modules.`);
			return undefined;
		}
		const mod = await core.load(name);
		if (mod) {
			const exports = Object.keys(mod as Record<string, unknown>).filter((k) => k !== "default");
			consola.info(`Loaded ${name}: ${exports.join(", ")}`);
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
		if (err) consola.warn("History unavailable:", err.message);
	});

	server.on("exit", async () => {
		consola.info("Disconnecting...");
		await core.db.$disconnect();
		process.exit(0);
	});
}

async function main() {
	const args = parseArgs(process.argv.slice(2));

	if (args.mode === "help") {
		printUsage();
		process.exit(0);
	}

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
			await runExec(core, args.expressions, args.preloadModules, args.raw, args.timeout);
			break;
		case "stdin":
			await runExec(core, [await readStdin()], args.preloadModules, args.raw, args.timeout);
			break;
		case "interactive":
			await runInteractive(core);
			return;
	}

	await core.db.$disconnect();
}

main().catch((err) => {
	const silent = !process.stdin.isTTY || process.argv.slice(2).length > 0;
	if (silent) {
		outputJson({ ok: false, error: (err as Error).message });
	} else {
		consola.error("REPL failed to start:", (err as Error).message);
	}
	process.exit(1);
});
