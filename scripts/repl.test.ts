import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function loadDotenv(): Record<string, string> {
	const envPath = path.resolve(process.cwd(), ".env");
	const vars: Record<string, string> = {};
	if (!fs.existsSync(envPath)) return vars;
	for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx).trim();
		let val = trimmed.slice(eqIdx + 1).trim();
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1);
		}
		vars[key] = val;
	}
	return vars;
}

const dotenvVars = loadDotenv();

function repl(args: string[], { timeout = 15_000 } = {}): Promise<{ stdout: string; stderr: string; code: number }> {
	return new Promise((resolve) => {
		execFile(
			process.execPath,
			["--import", "tsx", "scripts/repl.ts", ...args],
			{ timeout, env: { ...process.env, ...dotenvVars, FORCE_COLOR: "0" }, cwd: process.cwd() },
			(error, stdout, stderr) => {
				resolve({
					stdout: stdout.toString().trim(),
					stderr: stderr.toString().trim(),
					code: error ? (typeof error.code === "number" ? error.code : 1) : 0,
				});
			},
		);
	});
}

function parseJson(stdout: string): unknown {
	const trimmed = stdout.trim();
	if (!trimmed) return undefined;
	return JSON.parse(trimmed);
}

// ---------------------------------------------------------------------------
// Offline tests (no DB required)
// ---------------------------------------------------------------------------

describe("repl (offline)", () => {
	it("--help prints usage and exits 0", async () => {
		const { stderr, code } = await repl(["--help"]);
		expect(code).toBe(0);
		expect(stderr).toContain("Usage: pnpm repl");
		expect(stderr).toContain("--exec");
		expect(stderr).toContain("--schema");
		expect(stderr).toContain("--timeout");
		expect(stderr).toContain("--raw");
	});

	it("-h is alias for --help", async () => {
		const { stderr, code } = await repl(["-h"]);
		expect(code).toBe(0);
		expect(stderr).toContain("Usage: pnpm repl");
	});

	it("--modules returns registry without DB", async () => {
		const { stdout, code } = await repl(["--modules"]);
		expect(code).toBe(0);
		const data = parseJson(stdout) as { modules: Record<string, string> };
		expect(data.modules).toBeDefined();
		expect(data.modules.workflow).toBe("@/lib/server/workflow");
		expect(data.modules.submissions).toBe("@/lib/server/submissions");
		expect(Object.keys(data.modules).length).toBeGreaterThanOrEqual(15);
	});

	it("unknown flag exits with code 2", async () => {
		const { stderr, code } = await repl(["--nonexistent"]);
		expect(code).not.toBe(0);
		expect(stderr).toContain("Unknown argument");
	});
});

// ---------------------------------------------------------------------------
// Online tests (DB required)
// ---------------------------------------------------------------------------

describe("repl (online)", () => {
	it("--tables returns model names", async () => {
		const { stdout, code } = await repl(["--tables"]);
		expect(code).toBe(0);
		const data = parseJson(stdout) as { tables: string[] };
		expect(data.tables).toContain("user");
		expect(data.tables).toContain("submission");
		expect(data.tables).toContain("review");
	});

	it("--enums returns enum map", async () => {
		const { stdout, code } = await repl(["--enums"]);
		expect(code).toBe(0);
		const data = parseJson(stdout) as { enums: Record<string, string[]> };
		expect(data.enums.SubmissionStatus).toContain("DRAFT");
		expect(data.enums.UserRole).toContain("ADMIN");
	});

	it("--schema <model> returns single model schema", async () => {
		const { stdout, code } = await repl(["--schema", "user"]);
		expect(code).toBe(0);
		const data = parseJson(stdout) as { model: string; dbName: string; fields: Array<{ name: string; type: string }> };
		expect(data.model).toBe("User");
		expect(data.dbName).toBe("users");
		expect(data.fields.find((f) => f.name === "email")).toBeDefined();
		expect(data.fields.find((f) => f.name === "role")?.type).toBe("UserRole");
	});

	it("--schema without arg returns all models", async () => {
		const { stdout, code } = await repl(["--schema"]);
		expect(code).toBe(0);
		const data = parseJson(stdout) as { models: Record<string, { model: string }> };
		expect(data.models.User).toBeDefined();
		expect(data.models.Submission).toBeDefined();
		expect(data.models.Review).toBeDefined();
	});

	it("--schema unknown model returns error", async () => {
		const { stdout, code } = await repl(["--schema", "nonexistent"]);
		expect(code).not.toBe(0);
		const data = parseJson(stdout) as { ok: false; error: string };
		expect(data.ok).toBe(false);
		expect(data.error).toContain("Unknown model");
	});

	it("--module-exports returns function names", async () => {
		const { stdout, code } = await repl(["--module-exports", "workflow"]);
		expect(code).toBe(0);
		const data = parseJson(stdout) as { module: string; exports: string[] };
		expect(data.module).toBe("workflow");
		expect(data.exports.length).toBeGreaterThan(0);
	});

	it("--exec evaluates expression", async () => {
		const { stdout, code } = await repl(["--exec", "1 + 2"]);
		expect(code).toBe(0);
		const data = parseJson(stdout) as { ok: true; result: number };
		expect(data.ok).toBe(true);
		expect(data.result).toBe(3);
	});

	it("--exec with DB query", async () => {
		const { stdout, code } = await repl(["--exec", "await db.user.count()"]);
		expect(code).toBe(0);
		const data = parseJson(stdout) as { ok: true; result: number };
		expect(data.ok).toBe(true);
		expect(data.result).toBeGreaterThanOrEqual(0);
	});

	it("--exec with syntax error returns error", async () => {
		const { stdout, code } = await repl(["--exec", "invalid @@ syntax"]);
		expect(code).not.toBe(0);
		const data = parseJson(stdout) as { ok: false; error: string };
		expect(data.ok).toBe(false);
		expect(data.error).toBeTruthy();
	});

	it("--raw returns bare result", async () => {
		const { stdout, code } = await repl(["--raw", "--exec", "42"]);
		expect(code).toBe(0);
		const data = parseJson(stdout);
		expect(data).toBe(42);
	});

	it("--raw with complex query", async () => {
		const { stdout, code } = await repl(["--raw", "--exec", "await db.user.count()"]);
		expect(code).toBe(0);
		const data = parseJson(stdout);
		expect(typeof data).toBe("number");
	});

	it("multiple --exec returns array", async () => {
		const { stdout, code } = await repl(["--exec", "1", "--exec", "2"]);
		expect(code).toBe(0);
		const data = parseJson(stdout) as Array<{ ok: true; result: number }>;
		expect(Array.isArray(data)).toBe(true);
		expect(data).toHaveLength(2);
		expect(data[0].result).toBe(1);
		expect(data[1].result).toBe(2);
	});

	it("$ shared context persists between --exec", async () => {
		const { stdout, code } = await repl([
			"--exec", "$.x = 42",
			"--exec", "$.x + 8",
		]);
		expect(code).toBe(0);
		const data = parseJson(stdout) as Array<{ ok: true; result: number }>;
		expect(data[0].result).toBe(42);
		expect(data[1].result).toBe(50);
	});

	it("--timeout aborts long-running expressions", async () => {
		const { stdout, code } = await repl([
			"--timeout", "200",
			"--exec", "await new Promise(r => setTimeout(r, 10000))",
		]);
		expect(code).not.toBe(0);
		const data = parseJson(stdout) as { ok: false; error: string };
		expect(data.ok).toBe(false);
		expect(data.error).toContain("Timeout");
	});

	it("--module preloads module exports into context", async () => {
		const { stdout, code } = await repl([
			"--module", "workflow",
			"--exec", "typeof executeSubmissionTransition",
		]);
		expect(code).toBe(0);
		const data = parseJson(stdout) as { ok: true; result: string };
		expect(data.result).toBe("function");
	});

	it("--module with unknown module returns error", async () => {
		const { stdout, code } = await repl(["--module", "nonexistent", "--exec", "1"]);
		expect(code).not.toBe(0);
		const data = parseJson(stdout) as { ok: false; error: string };
		expect(data.ok).toBe(false);
		expect(data.error).toContain("Unknown module");
	});

	it("enums are available in exec context", async () => {
		const { stdout, code } = await repl(["--exec", "SubmissionStatus.DRAFT"]);
		expect(code).toBe(0);
		const data = parseJson(stdout) as { ok: true; result: string };
		expect(data.result).toBe("DRAFT");
	});

	it("schema is case-insensitive", async () => {
		const r1 = await repl(["--schema", "user"]);
		const r2 = await repl(["--schema", "User"]);
		expect(r1.code).toBe(0);
		expect(r2.code).toBe(0);
		const d1 = parseJson(r1.stdout) as { model: string };
		const d2 = parseJson(r2.stdout) as { model: string };
		expect(d1.model).toBe(d2.model);
	});
});
