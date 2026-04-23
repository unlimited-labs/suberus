/**
 * Smoke test for embeddings on real conference abstracts (kpt2025-demo/2025).
 *
 * Flow:
 *   1. Read N PDFs, pass through docling → markdown
 *   2. Extract title (first heading) + body text
 *   3. Call qwen-embed via /v1/embeddings
 *   4. Print cosine similarity matrix + a simple nearest-neighbor grouping
 *
 * No DB writes. Purely validates pipeline quality on realistic input.
 *
 * Usage: pnpm tsx scripts/test-embeddings.ts [N]
 */

import "dotenv/config";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEMO_DIR = path.resolve("kpt2025-demo/2025");
const LLM_API_URL = process.env.LLM_API_URL;
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_EMBEDDING_MODEL = process.env.LLM_EMBEDDING_MODEL;

if (!LLM_API_URL || !LLM_EMBEDDING_MODEL) {
	console.error("LLM_API_URL and LLM_EMBEDDING_MODEL must be set");
	process.exit(1);
}

interface Doc {
	file: string;
	title: string;
	body: string;
}

function extractTitleAndBody(text: string): { title: string; body: string } {
	const lines = text
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
	const title = lines[0] ?? "(no title)";
	const body = lines.slice(1).join("\n").trim();
	return { title, body };
}

async function pdfToText(filePath: string): Promise<string> {
	const { stdout } = await execFileAsync("pdftotext", ["-layout", filePath, "-"]);
	return stdout;
}

async function loadDocs(limit: number): Promise<Doc[]> {
	const files = (await fs.readdir(DEMO_DIR))
		.filter((f) => f.toLowerCase().endsWith(".pdf"))
		.sort()
		.slice(0, limit);

	const docs: Doc[] = [];
	for (const f of files) {
		try {
			const text = await pdfToText(path.join(DEMO_DIR, f));
			const { title, body } = extractTitleAndBody(text);
			if (body.length < 100) {
				console.warn(`[skip] ${f}: body too short (${body.length} chars)`);
				continue;
			}
			docs.push({ file: f, title, body });
			console.log(
				`[loaded] ${f}: "${title.slice(0, 70)}" (${body.length} chars body)`,
			);
		} catch (e) {
			console.warn(`[skip] pdftotext failed for ${f}: ${(e as Error).message}`);
		}
	}
	return docs;
}

const MAX_TEXT_CHARS = 3000;

function truncate(text: string): string {
	return text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
}

async function embedOne(text: string): Promise<number[]> {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	if (LLM_API_KEY) headers.Authorization = `Bearer ${LLM_API_KEY}`;

	const res = await fetch(`${LLM_API_URL}/embeddings`, {
		method: "POST",
		headers,
		body: JSON.stringify({ model: LLM_EMBEDDING_MODEL, input: truncate(text) }),
		signal: AbortSignal.timeout(180_000),
	});
	if (!res.ok) throw new Error(`Embedding API ${res.status}: ${await res.text()}`);
	const data = (await res.json()) as { data: { embedding: number[] }[] };
	return data.data[0].embedding;
}

async function embed(texts: string[]): Promise<number[][]> {
	const out: number[][] = [];
	for (const t of texts) out.push(await embedOne(t));
	return out;
}

function cosine(a: number[], b: number[]): number {
	let dot = 0;
	let na = 0;
	let nb = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function main() {
	const limit = Number(process.argv[2] ?? 10);
	console.log(`\n=== Embedding quality test on ${limit} abstracts ===\n`);

	const t0 = Date.now();
	const docs = await loadDocs(limit);
	console.log(`\n[docs] loaded ${docs.length} in ${Date.now() - t0}ms\n`);

	const texts = docs.map((d) => `${d.title}\n\n${d.body}`);

	const t1 = Date.now();
	const vecs = await embed(texts);
	const t2 = Date.now();
	console.log(
		`[embed] ${vecs.length} vectors of dim ${vecs[0]?.length} in ${t2 - t1}ms\n`,
	);

	// Cosine matrix
	console.log("=== Cosine similarity matrix ===");
	const n = docs.length;
	const header = "      " + docs.map((_, i) => String(i + 1).padStart(6)).join("");
	console.log(header);
	for (let i = 0; i < n; i++) {
		const row = [String(i + 1).padStart(3), " |"];
		for (let j = 0; j < n; j++) {
			if (j === i) row.push("  1.00".padStart(7));
			else row.push(cosine(vecs[i], vecs[j]).toFixed(2).padStart(7));
		}
		console.log(row.join(""));
	}

	// Nearest neighbor per doc
	console.log("\n=== Nearest neighbor per doc ===");
	for (let i = 0; i < n; i++) {
		let bestJ = -1;
		let bestSim = -1;
		for (let j = 0; j < n; j++) {
			if (j === i) continue;
			const s = cosine(vecs[i], vecs[j]);
			if (s > bestSim) {
				bestSim = s;
				bestJ = j;
			}
		}
		console.log(
			`${String(i + 1).padStart(3)}. ${docs[i].title.slice(0, 55).padEnd(55)} → [${bestJ + 1}] ${docs[bestJ].title.slice(0, 50)} (cos=${bestSim.toFixed(3)})`,
		);
	}

	// Cluster via planner-api
	const plannerUrl = process.env.PLANNER_API_URL;
	if (!plannerUrl) return;

	const sessionCount = Math.max(2, Math.ceil(n / 4));
	console.log(
		`\n=== Clustering via planner-api (K=${sessionCount}, tolerance=1) ===`,
	);
	const t3 = Date.now();
	const clusterRes = await fetch(`${plannerUrl}/cluster`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			items: docs.map((d, i) => ({ id: d.file, embedding: vecs[i] })),
			session_count: sessionCount,
			tolerance: 1,
		}),
	});
	if (!clusterRes.ok) {
		console.error(`planner-api error ${clusterRes.status}: ${await clusterRes.text()}`);
		return;
	}
	const out = (await clusterRes.json()) as {
		clusters: { session_index: number; member_ids: string[] }[];
		target_per_session: number;
		size_min: number;
		size_max: number;
	};
	console.log(
		`[cluster] ${Date.now() - t3}ms, target=${out.target_per_session} [${out.size_min}..${out.size_max}]\n`,
	);
	for (const c of out.clusters) {
		console.log(`  Session ${c.session_index + 1} (${c.member_ids.length} items):`);
		for (const id of c.member_ids) {
			const d = docs.find((x) => x.file === id);
			console.log(`    - ${id}: ${d?.title.slice(0, 70)}`);
		}
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
