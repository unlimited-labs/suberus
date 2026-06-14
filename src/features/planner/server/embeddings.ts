import crypto from "node:crypto";
import { PromisePool } from "@supercharge/promise-pool";
import { env } from "@/env";
import { logger } from "@/logger.ts";
import { prisma } from "@/shared/server/db.server";

const EMBEDDING_DIM = 2560;
const MAX_TEXT_CHARS = 3000;
const EMBEDDING_TIMEOUT_MS = 180_000;

export interface EmbeddingInput {
	id: string;
	title: string;
	content: string;
}

export interface EmbeddingResult {
	id: string;
	embedding: number[];
}

function computeHash(title: string, content: string, model: string): string {
	const text = `${title.trim()}\n\n${content.trim()}`;
	return crypto
		.createHash("sha256")
		.update(`${text}\n\n${model}`)
		.digest("hex");
}

function vectorLiteral(v: number[]): string {
	return `[${v.join(",")}]`;
}

function parseVector(s: string): number[] {
	return JSON.parse(s) as number[];
}

function truncate(text: string): string {
	return text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
}

async function callEmbeddingApi(text: string): Promise<number[]> {
	if (!env.LLM_API_URL) throw new Error("LLM_API_URL not configured");
	if (!env.LLM_EMBEDDING_MODEL)
		throw new Error("LLM_EMBEDDING_MODEL not configured");

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (env.LLM_API_KEY) headers.Authorization = `Bearer ${env.LLM_API_KEY}`;

	const res = await fetch(`${env.LLM_API_URL}/embeddings`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			model: env.LLM_EMBEDDING_MODEL,
			input: truncate(text),
		}),
		signal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS),
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(
			`Embedding API returned ${res.status}: ${body.slice(0, 200)}`,
		);
	}

	const data = (await res.json()) as { data: { embedding: number[] }[] };
	const v = data.data[0]?.embedding;
	if (!v) throw new Error("Embedding API returned no data");
	return v;
}

export interface EmbedSubmissionsOptions {
	onProgress?: (done: number) => void;
}

export async function embedSubmissions(
	inputs: EmbeddingInput[],
	options: EmbedSubmissionsOptions = {},
): Promise<EmbeddingResult[]> {
	if (inputs.length === 0) return [];
	if (!env.LLM_EMBEDDING_MODEL)
		throw new Error("LLM_EMBEDDING_MODEL not configured");

	const model = env.LLM_EMBEDDING_MODEL;

	const withHashes = inputs.map((i) => ({
		...i,
		hash: computeHash(i.title, i.content, model),
	}));

	const ids = withHashes.map((x) => x.id);

	const cached = await prisma.$queryRaw<
		{ submissionId: string; hash: string; embedding: string }[]
	>`
		SELECT "submissionId", hash, embedding::text AS embedding
		FROM submission_embeddings
		WHERE "submissionId" = ANY(${ids}::uuid[])
		  AND model = ${model}
	`;

	const cacheById = new Map(cached.map((c) => [c.submissionId, c]));

	const toCompute = withHashes.filter((x) => {
		const c = cacheById.get(x.id);
		return !c || c.hash !== x.hash;
	});

	logger.info(
		`[embeddings] ${inputs.length} requested, ${inputs.length - toCompute.length} cached, ${toCompute.length} to compute`,
	);

	let done = 0;
	const report = () => options.onProgress?.(++done);

	// Cached hits count as immediate progress.
	for (let i = 0; i < inputs.length - toCompute.length; i++) report();

	const fresh = new Map<string, number[]>();
	const { errors } = await PromisePool.for(toCompute)
		.withConcurrency(env.LLM_CONCURRENCY)
		.process(async (item) => {
			const v = await callEmbeddingApi(`${item.title}\n\n${item.content}`);
			if (v.length !== EMBEDDING_DIM) {
				throw new Error(
					`Embedding dim mismatch for ${item.id}: got ${v.length}, expected ${EMBEDDING_DIM}`,
				);
			}
			const literal = vectorLiteral(v);
			await prisma.$executeRaw`
				INSERT INTO submission_embeddings ("submissionId", embedding, hash, model, "updatedAt")
				VALUES (${item.id}::uuid, ${literal}::vector, ${item.hash}, ${model}, NOW())
				ON CONFLICT ("submissionId") DO UPDATE
				SET embedding = EXCLUDED.embedding,
				    hash = EXCLUDED.hash,
				    model = EXCLUDED.model,
				    "updatedAt" = NOW()
			`;
			fresh.set(item.id, v);
			report();
		});

	if (errors.length > 0) {
		throw new Error(
			`Embedding failed for ${errors.length} item(s): ${errors.map((e) => e.message).join("; ")}`,
		);
	}

	return withHashes.map((x) => {
		const c = cacheById.get(x.id);
		if (c && c.hash === x.hash) {
			return { id: x.id, embedding: parseVector(c.embedding) };
		}
		const v = fresh.get(x.id);
		if (!v) throw new Error(`Missing embedding for ${x.id}`);
		return { id: x.id, embedding: v };
	});
}
