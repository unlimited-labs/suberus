import repl from "node:repl";
import path from "node:path";
import chalk from "chalk";

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

async function main() {
	// 1. Import Prisma (sets globalThis.__prisma in dev)
	const { prisma: db } = await import("@/db.server.ts");

	// 2. Import enums
	const Enums = await import("../src/generated/prisma/enums.ts");

	// 3. Verify DB connectivity
	try {
		await db.$queryRawUnsafe("SELECT 1");
		console.log(chalk.green("\n  DB connected."));
	} catch (err) {
		console.error(chalk.red("\n  Failed to connect to database:"), (err as Error).message);
		process.exit(1);
	}

	// 4. Load helper
	const moduleCache = new Map<string, unknown>();

	async function load(name: string): Promise<unknown> {
		if (moduleCache.has(name)) return moduleCache.get(name);

		const modulePath = MODULE_REGISTRY[name];
		if (!modulePath) {
			console.error(chalk.red(`Unknown module "${name}". Use .modules to see available modules.`));
			return undefined;
		}

		try {
			const mod = await import(modulePath);
			moduleCache.set(name, mod);
			const exports = Object.keys(mod).filter((k) => k !== "default");
			console.log(chalk.dim(`Loaded ${name}: ${exports.join(", ")}`));
			return mod;
		} catch (err) {
			console.error(chalk.red(`Failed to load "${name}":`), (err as Error).message);
			return undefined;
		}
	}

	// 5. Print banner & start REPL
	printBanner();

	const server = repl.start({
		prompt: chalk.cyan("suberus") + chalk.dim("> "),
		useColors: true,
		preview: true,
	});

	// 6. Context
	server.context.db = db;
	server.context.load = load;
	server.context.chalk = chalk;

	// Spread enums individually (SubmissionStatus, UserRole, etc.)
	for (const [key, value] of Object.entries(Enums)) {
		if (typeof value === "object" && value !== null) {
			server.context[key] = value;
		}
	}

	// 7. Custom commands
	server.defineCommand("tables", {
		help: "List all Prisma model names",
		action() {
			const models = Object.keys(db)
				.filter((k) => !k.startsWith("$") && !k.startsWith("_") && k !== "constructor")
				.sort();
			console.log(chalk.cyan("\nAvailable models:"));
			for (const m of models) {
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
			for (const [name, values] of Object.entries(Enums)) {
				if (typeof values === "object" && values !== null && !Array.isArray(values)) {
					const vals = Object.keys(values as Record<string, unknown>);
					console.log(`  ${chalk.yellow(name)}: ${vals.join(", ")}`);
				}
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

	// 8. History
	const historyPath = path.join(process.cwd(), ".repl_history");
	server.setupHistory(historyPath, (err) => {
		if (err) console.error(chalk.dim("History unavailable:"), err.message);
	});

	// 9. Graceful shutdown
	server.on("exit", async () => {
		console.log(chalk.dim("\nDisconnecting..."));
		await db.$disconnect();
		process.exit(0);
	});
}

main().catch((err) => {
	console.error(chalk.red("REPL failed to start:"), err.message);
	process.exit(1);
});
