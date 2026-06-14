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

	// Worker registration is indirected through the app-shell composition root
	// (`src/pg-boss-workers`, an untracked module) so this shared infra file never
	// imports feature code — keeps the shared→feature boundary clean. Dynamic import
	// keeps the heavy worker code lazy (loaded on first enqueue, same as before) and
	// in THIS module instance, so the single lazy boss owns its workers (a nitro
	// plugin would be a separate bundle — its singleton wouldn't reach this initBoss).
	const { registerAllWorkers } = await import("@/pg-boss-workers");
	await registerAllWorkers(boss);

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
