import type { Job, PgBoss } from "pg-boss";
import { logger } from "@/logger.ts";
import {
	checkVatId,
	purgeOrphanVatIdChecks,
	VAT_ID_RETRY_QUEUE,
	type VatIdRetryJobData,
} from "../vat-id-check";

const VAT_ID_PURGE_QUEUE = "vat-id-purge";
const RETRY_WINDOW_MS = 72 * 60 * 60 * 1000;

export async function handleVatIdRetry(
	jobs: Job<VatIdRetryJobData>[],
	now = Date.now(),
): Promise<void> {
	for (const { data } of jobs) {
		const check = await checkVatId(data.vatId, { fromRetry: true });
		if (check.status !== "UNAVAILABLE") continue;
		if (now - Date.parse(data.since) >= RETRY_WINDOW_MS) {
			logger.info(`[vat-id] giving up on ${data.vatId.slice(0, 2)} after 72 h`);
			continue;
		}
		throw new Error("VAT ID registry still unavailable");
	}
}

export async function handleVatIdPurge(): Promise<void> {
	const deleted = await purgeOrphanVatIdChecks();
	logger.info(`[vat-id] purged ${deleted} orphan registry checks`);
}

export async function registerVatIdWorkers(boss: PgBoss): Promise<void> {
	const retryQueue = await boss.getQueue(VAT_ID_RETRY_QUEUE);
	if (!retryQueue) {
		await boss.createQueue(VAT_ID_RETRY_QUEUE, { policy: "exclusive" });
	} else if (retryQueue.policy !== "exclusive") {
		logger.error(
			`[vat-id] ${VAT_ID_RETRY_QUEUE} has policy ${retryQueue.policy}; retries will not be de-duplicated`,
		);
	}
	if (!(await boss.getQueue(VAT_ID_PURGE_QUEUE))) {
		await boss.createQueue(VAT_ID_PURGE_QUEUE);
	}
	await boss.work<VatIdRetryJobData>(
		VAT_ID_RETRY_QUEUE,
		{ localConcurrency: 1 },
		(jobs) => handleVatIdRetry(jobs),
	);
	await boss.work(VAT_ID_PURGE_QUEUE, () => handleVatIdPurge());
	await boss.schedule(VAT_ID_PURGE_QUEUE, "17 3 * * *");
}
