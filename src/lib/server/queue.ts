import { PgBoss } from "pg-boss";
import { env } from "@/env.ts";
import { logger } from "@/logger.ts";

let _boss: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
	if (_boss) return _boss;

	_boss = new PgBoss({
		connectionString: env.DATABASE_URL,
		monitorIntervalSeconds: 30,
	});

	_boss.on("error", (err: Error) => logger.error("[pg-boss] error:", err));

	await _boss.start();
	logger.info("[pg-boss] started");

	const { registerExtractionWorker } = await import("./workers/extraction");
	const { registerAutoplanWorker } = await import("./workers/autoplan");
	await registerExtractionWorker(_boss);
	await registerAutoplanWorker(_boss);

	return _boss;
}

export async function stopBoss(): Promise<void> {
	if (_boss) {
		await _boss.stop({ graceful: true, timeout: 10_000 });
		_boss = null;
		logger.info("[pg-boss] stopped");
	}
}
