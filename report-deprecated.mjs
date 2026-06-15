// Reports usages of @deprecated symbols, using the native (Go) TypeScript
// compiler via @typescript/native-preview's unstable API. The compiler's own
// suggestion diagnostics (reportsDeprecated) drive detection — ~5x faster than
// walking the AST with ts-morph, with full coverage (imports, property access,
// calls). Run with `node` (not tsx — its .ts loader collides with the package's
// internal resolution).
//
// The diagnostic only carries a generic "'x' is deprecated." text, so we recover
// the original @deprecated <reason> by resolving each hit's symbol to its
// declaration and reading the JSDoc tag. Import-alias sites (e.g. `useStore`)
// resolve to the import binding, which the API can't follow to the original
// declaration — those fall back to the generic message.
//
// Usage:
//   node report-deprecated.mjs          human-readable report
//   node report-deprecated.mjs --json   machine-readable JSON
// Exits 1 when any deprecated usage is found (CI gate), 0 otherwise.
import fs from "node:fs";
import path from "node:path";
import { API, fileNameToDocumentURI } from "@typescript/native-preview/unstable/async";

const ROOT = import.meta.dirname;
const AS_JSON = process.argv.includes("--json");

const fileTextCache = new Map();
function readText(fileName) {
	let text = fileTextCache.get(fileName);
	if (text === undefined) {
		text = fs.readFileSync(fileName, "utf8");
		fileTextCache.set(fileName, text);
	}
	return text;
}

function lineCol(text, pos) {
	let line = 1;
	let lastNewline = -1;
	for (let i = 0; i < pos; i++) {
		if (text.charCodeAt(i) === 10) {
			line++;
			lastNewline = i;
		}
	}
	return { line, col: pos - lastNewline };
}

const TAG_RE = /@deprecated\b[ \t]*([\s\S]*?)(?=\n[ \t]*\*[ \t]*@|\*\/|$)/;
function reasonFromComment(commentText) {
	const m = TAG_RE.exec(commentText);
	if (!m) return undefined;
	const reason = m[1]
		.split("\n")
		.map((l) => l.replace(/^[ \t]*\*?[ \t]?/, "").trimEnd())
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();
	return reason || "(no message)";
}

/** Recover the @deprecated reason text from the symbol's declaration JSDoc. */
async function recoverReason(project, fileName, pos) {
	try {
		const symbol = await project.checker.getSymbolAtPosition({ uri: fileNameToDocumentURI(fileName) }, pos);
		for (const decl of symbol?.declarations ?? []) {
			const node = await decl.resolve(project);
			if (!node?.jsDoc?.length) continue;
			const declPath = String(decl.path);
			for (const jd of node.jsDoc) {
				const reason = reasonFromComment(readText(declPath).slice(jd.pos, jd.end));
				if (reason !== undefined) return reason;
			}
		}
	} catch {
		// fall through to the generic diagnostic message
	}
	return undefined;
}

/** Run the native compiler and return a sorted, de-duplicated list of usages. */
async function collectUsages() {
	const api = new API({ cwd: ROOT });
	const snapshot = await api.updateSnapshot({ openProject: path.join(ROOT, "tsconfig.json") });

	const seen = new Set();
	const hits = [];
	for (const project of snapshot.getProjects()) {
		for (const diag of await project.program.getSuggestionDiagnostics()) {
			if (!diag.reportsDeprecated || !diag.fileName) continue;
			if (diag.fileName.includes("node_modules") || diag.fileName.includes(".gen.")) continue;
			const key = `${diag.fileName}:${diag.pos}:${diag.code}`;
			if (seen.has(key)) continue;
			seen.add(key);
			hits.push({ project, diag });
		}
	}

	const usages = [];
	for (const { project, diag } of hits) {
		const { line, col } = lineCol(readText(diag.fileName), diag.pos);
		const message = (await recoverReason(project, diag.fileName, diag.pos)) ?? diag.text;
		usages.push({
			file: path.relative(ROOT, diag.fileName).replaceAll("\\", "/"),
			line,
			col,
			code: diag.code,
			message,
		});
	}

	await api.close();
	usages.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.col - b.col);
	return usages;
}

function reportJson(usages) {
	process.stdout.write(`${JSON.stringify({ count: usages.length, usages }, null, 2)}\n`);
}

function reportText(usages) {
	if (usages.length === 0) {
		console.log("No deprecated usages found.");
		return;
	}
	console.log(`Found ${usages.length} deprecated usage(s):\n`);
	let currentFile;
	for (const u of usages) {
		if (u.file !== currentFile) {
			if (currentFile !== undefined) console.log();
			console.log(u.file);
			currentFile = u.file;
		}
		console.log(`  ${u.line}:${u.col}  ${u.message}`);
	}
	console.log();
}

const usages = await collectUsages();
(AS_JSON ? reportJson : reportText)(usages);
process.exit(usages.length === 0 ? 0 : 1);
