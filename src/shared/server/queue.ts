import { PgBoss } from "pg-boss";
import { env } from "@/env.ts";
import { logger } from "@/logger.ts";

const QUEUES = ["extraction", "autoplan"] as const;

let _initPromise: Promise<PgBoss> | null = null;

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

	const { registerExtractionWorker } = await import(
		"@/features/extraction/server/workers/extraction"
	);
	const { registerAutoplanWorker } = await import(
		"@/features/planner/server/workers/autoplan"
	);
	await registerExtractionWorker(boss);
	await registerAutoplanWorker(boss);

	return boss;
}

export function getBoss(): Promise<PgBoss> {
	if (!_initPromise) {
		_initPromise = initBoss().catch((err) => {
			_initPromise = null;
			throw err;
		});
	}
	return _initPromise;
}

export async function ensureQueueAndSend(
	name: string,
	data: object,
): Promise<string | null> {
	logger.info(`[pg-boss] ensureQueueAndSend: ${name}`);
	const boss = await getBoss();
	logger.info(`[pg-boss] got boss, checking queue: ${name}`);
	const queue = await boss.getQueue(name);
	if (!queue) {
		logger.info(`[pg-boss] queue ${name} not found, creating...`);
		await boss.createQueue(name);
	}
	const jobId = await boss.send(name, data);
	logger.info(`[pg-boss] sent job ${jobId} to ${name}`);
	return jobId;
}

export async function stopBoss(): Promise<void> {
	if (_initPromise) {
		const boss = await _initPromise;
		await boss.stop({ graceful: true, timeout: 10_000 });
		_initPromise = null;
		logger.info("[pg-boss] stopped");
	}
}
