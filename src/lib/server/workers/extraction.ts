import type { Job, PgBoss } from "pg-boss";
import { getDoclingMarkdown } from "../docling";
import { parseDocx } from "../docx-parser";
import {
	type ExtractionResult,
	isLowConfidence,
	mergeResults,
} from "../extraction";
import { extractFromZones } from "../extraction-heuristic";
import { extractWithLlm } from "../extraction-llm";
import { MAX_HEADER_FALLBACK } from "../extraction-patterns";
import { classifyZones } from "../extraction-zones";
import { completeJob, failJob, setJobStage } from "../job-progress";
import { checkLlmHealth } from "../llm";
import { deleteFile, getFileBuffer } from "../storage";

export interface ExtractionJobData {
	jobId: string;
	storageKey: string;
	fileName: string;
	heuristic: boolean;
	ai: boolean;
}

function cutAtAbstract(md: string): string {
	const headerEnd = md.search(
		/\n\s*(\*\*)?(Abstract|Introduction|ABSTRACT|\d+\.\s)/,
	);
	return headerEnd > 0
		? md.slice(0, headerEnd)
		: md.slice(0, MAX_HEADER_FALLBACK);
}

async function tryLlmExtraction(
	plainText: string,
): Promise<ExtractionResult | null> {
	const health = await checkLlmHealth();
	if (health.status !== "healthy") return null;
	try {
		return await extractWithLlm(plainText);
	} catch (error) {
		console.error("[extraction-worker] LLM extraction failed:", error);
		return null;
	}
}

async function handleExtraction(jobs: Job<ExtractionJobData>[]): Promise<void> {
	for (const job of jobs) {
		await processExtractionJob(job);
	}
}

async function processExtractionJob(
	job: Job<ExtractionJobData>,
): Promise<ExtractionResult> {
	const { jobId, storageKey, fileName, heuristic, ai } = job.data;
	const isDocx = fileName.toLowerCase().endsWith(".docx");

	try {
		await setJobStage(jobId, "downloading", 1);
		const buffer = await getFileBuffer(storageKey);

		if (isDocx && heuristic && !ai) {
			await setJobStage(jobId, "heuristic", 1);
			const paragraphs = parseDocx(buffer);
			const classified = classifyZones(paragraphs);
			const result = extractFromZones(classified);
			await completeJob(jobId, result as object);
			return result;
		}

		if (isDocx && heuristic && ai) {
			await setJobStage(jobId, "heuristic", 2);
			const paragraphs = parseDocx(buffer);
			const classified = classifyZones(paragraphs);
			const heuristicResult = extractFromZones(classified);

			if (!isLowConfidence(heuristicResult)) {
				await completeJob(jobId, heuristicResult as object);
				return heuristicResult;
			}

			// Low confidence — try AI fallback
			await setJobStage(jobId, "ai", 2);
			const doclingMd = await getDoclingMarkdown(buffer, fileName);
			const llmInput = doclingMd
				? cutAtAbstract(doclingMd)
				: classified
						.filter((c) => c.zone !== "BODY")
						.map((c) => c.para.text.trim())
						.join("\n");

			const aiResult = await tryLlmExtraction(llmInput);
			const merged = aiResult
				? mergeResults(heuristicResult, aiResult)
				: heuristicResult;
			await completeJob(jobId, merged as object);
			return merged;
		}

		// AI-only path (DOCX or PDF)
		await setJobStage(jobId, "docling", 2);
		const doclingMd = await getDoclingMarkdown(buffer, fileName);
		if (!doclingMd) {
			await completeJob(jobId, {});
			return {};
		}

		await setJobStage(jobId, "ai", 2);
		const llmInput = cutAtAbstract(doclingMd);
		const aiResult = await tryLlmExtraction(llmInput);
		const finalResult = aiResult ?? {};
		await completeJob(jobId, finalResult as object);
		return finalResult;
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown extraction error";
		await failJob(jobId, message);
		throw error;
	} finally {
		await deleteFile(storageKey).catch((err) => {
			console.error("[extraction-worker] failed to delete staged file:", err);
		});
	}
}

export async function registerExtractionWorker(boss: PgBoss): Promise<void> {
	await boss.work<ExtractionJobData>(
		"extraction",
		{ localConcurrency: 2 },
		handleExtraction,
	);
}
