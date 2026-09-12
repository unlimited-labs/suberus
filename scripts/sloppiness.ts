import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

// Verbosity + Erosion, per https://earendil.com/posts/measuring-code-sloppiness/
// The article's ast-grep heuristics were never published, so absolute values are
// NOT comparable to its 0.15/0.33 and 0.31/0.68 bands — track the trend instead.

const NULL_DEVICE = process.platform === "win32" ? "NUL" : "/dev/null";
const BASELINE_PATH = "sloppiness-baseline.json";
const EXCLUDED = [/^src\/routeTree\.gen\.ts$/, /^src\/generated\//, /^src\/shared\/ui\//];
const isTest = (p: string) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(p);
const inScope = (p: string) => p.startsWith("src/") && !EXCLUDED.some((r) => r.test(p));

// fallow and oxlint both exit non-zero when they report anything; stdout still holds the report.
function run(cmd: string, args: string[]): string {
	try {
		return execSync(`${cmd} ${args.join(" ")} 2>${NULL_DEVICE}`, {
			encoding: "utf8",
			maxBuffer: 256 << 20,
		});
	} catch (error) {
		const stdout = (error as { stdout?: string }).stdout;
		if (typeof stdout === "string" && stdout) return stdout;
		throw error;
	}
}

// fallow emits NDJSON with a leading agent-environment notice record.
function fallowJson(args: string[]): Record<string, unknown> {
	const out = run("fallow", [...args, "--format", "json"]);
	for (const line of out.split("\n")) {
		if (!line.trim()) continue;
		const parsed: unknown = JSON.parse(line);
		if (parsed && typeof parsed === "object" && "kind" in parsed) {
			// SAFETY: guarded above — object carrying fallow's `kind` discriminator.
			return parsed as Record<string, unknown>;
		}
	}
	throw new Error(`no fallow result record in: ${args.join(" ")}`);
}

type Finding = { path: string; cyclomatic: number; line_count: number };
type CloneInstance = { file: string; start_line: number; end_line: number };

// Tests are excluded from the gated count only: growing them is the outcome we want.
function sloc(): { all: number; nonTest: number } {
	const files = run("git", ["ls-files", "src"]).split("\n").map((f) => f.trim()).filter(inScope);
	let all = 0;
	let nonTest = 0;
	for (const file of files) {
		let lines = 0;
		for (const line of readFileSync(file, "utf8").split("\n")) if (line.trim()) lines++;
		all += lines;
		if (!isTest(file)) nonTest += lines;
	}
	return { all, nonTest };
}

function erosion(): { value: number; hot: number; total: number } {
	const health = fallowJson([
		"health", "--complexity",
		"--max-cyclomatic", "0", "--max-cognitive", "65535", "--max-crap", "100000",
	]);
	// SAFETY: fallow health schema 11 — findings[] carries path/cyclomatic/line_count.
	const findings = (health.findings as Finding[]).filter((f) => inScope(f.path));
	const mass = (f: Finding) => f.cyclomatic * Math.sqrt(Math.max(f.line_count, 1));
	const total = findings.reduce((sum, f) => sum + mass(f), 0);
	const hot = findings.filter((f) => f.cyclomatic > 10).reduce((sum, f) => sum + mass(f), 0);
	return { value: hot / total, hot, total };
}

function flaggedLines(): { lines: Set<string>; cloneLines: number; lintLines: number } {
	const dupes = fallowJson([
		"dupes", "--min-occurrences", "2", "--min-lines", "5", "--min-tokens", "50",
	]);
	const lines = new Set<string>();
	// SAFETY: fallow dupes schema — clone_groups[].instances[] carries file/start_line/end_line.
	for (const group of dupes.clone_groups as { instances: CloneInstance[] }[]) {
		for (const i of group.instances) {
			if (!inScope(i.file)) continue;
			for (let n = i.start_line; n <= i.end_line; n++) lines.add(`${i.file}:${n}`);
		}
	}
	const cloneLines = lines.size;

	const lint = run("oxlint", ["-c", "oxlint.verbosity.jsonc", "--format", "unix", "src"]);
	for (const line of lint.split("\n")) {
		const match = /^(.+?):(\d+):\d+:/.exec(line.trim());
		if (match && inScope(match[1].replaceAll("\\", "/"))) {
			lines.add(`${match[1].replaceAll("\\", "/")}:${match[2]}`);
		}
	}
	return { lines, cloneLines, lintLines: lines.size - cloneLines };
}

type Baseline = { hotMass: number; cloneLines: number; locNonTest: number };

const loc = sloc();
const e = erosion();
const v = flaggedLines();
const current: Baseline = {
	hotMass: Math.round(e.hot),
	cloneLines: v.cloneLines,
	locNonTest: loc.nonTest,
};
const pct = (n: number) => n.toFixed(3);

console.log(`scope        src/ minus generated + shared/ui — ${loc.all} non-blank lines`);
console.log(`verbosity    ${pct(v.lines.size / loc.all)}  (${v.cloneLines} clone + ${v.lintLines} lint lines)`);
console.log(`erosion      ${pct(e.value)}  (CC>10 mass ${current.hotMass} of ${e.total.toFixed(0)})`);

if (!existsSync(BASELINE_PATH)) process.exit(0);

// SAFETY: repo-owned file written by this script; shape re-checked below per key.
const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Baseline;
let regressed = false;
console.log("");
for (const key of ["hotMass", "cloneLines", "locNonTest"] as const) {
	const delta = current[key] - baseline[key];
	const sign = delta > 0 ? "+" : "";
	console.log(`${key.padEnd(12)} ${current[key]}  (${sign}${delta} vs baseline ${baseline[key]})`);
	if (delta > 0) regressed = true;
}
if (regressed) {
	// ponytail: reporting only until the refactor lands; flip to exit 1 with the CI gate.
	console.log(`\nAbove baseline. Cut the numerator or re-baseline in ${BASELINE_PATH}.`);
}
