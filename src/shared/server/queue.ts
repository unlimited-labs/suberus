import { PgBoss } from "pg-boss";
import { env } from "@/env.ts";
import { logger } from "@/logger.ts";

const QUEUES = [
	"extraction",
	"autoplan",
	"bulk-email",
	"announcement-publish",
	"submission-diff",
	"document-generate",
] as const;

declare global {
	var __pgBoss: Promise<PgBoss> | undefined;
}

async function initBoss(): Promise<PgBoss> {
	const boss = new PgBoss({
		connectionString: env.DATABASE_URL,
		monitorIntervalSeconds: 30,
	});

	boss.on("error", (err: Error) => logger.error("[pg-boss] error:", err));

	await boss.start();
	logger.info("[pg-boss] started");

	for (const q of QUEUES) {
		await boss.createQueue(q).catch(() => {});
	}

	// Lazy import keeps feature code out of this shared module; the cycle
	// (queue→workers→feature→queue) closes only here, so there's no init-order hazard.
	// fallow-ignore-next-line circular-dependency
	const { registerAllWorkers } = await import("@/pg-boss-workers");
	await registerAllWorkers(boss);

	return boss;
}

// On globalThis: the nitro boot plugin and the request path load separate copies of
// this module, and both must share one boss or every worker registers twice.
export function getBoss(): Promise<PgBoss> {
	globalThis.__pgBoss ??= initBoss().catch((err) => {
		globalThis.__pgBoss = undefined;
		throw err;
	});
	return globalThis.__pgBoss;
}

export interface QueueSendOptions {
	retryLimit?: number;
	retryDelay?: number;
	expireInSeconds?: number;
	/** Compared against the DB clock, not ours. */
	startAfter?: Date;
}

export async function ensureQueueAndSend<Data extends object>(
	name: string,
	data: Data,
	options?: QueueSendOptions,
): Promise<string | null> {
	logger.info(`[pg-boss] ensureQueueAndSend: ${name}`);
	const boss = await getBoss();
	logger.info(`[pg-boss] got boss, checking queue: ${name}`);
	const queue = await boss.getQueue(name);
	if (!queue) {
		logger.info(`[pg-boss] queue ${name} not found, creating...`);
		await boss.createQueue(name);
	}
	const jobId = await boss.send(name, data, options ?? {});
	logger.info(`[pg-boss] sent job ${jobId} to ${name}`);
	return jobId;
}
