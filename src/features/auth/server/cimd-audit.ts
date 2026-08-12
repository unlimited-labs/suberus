import {
	type LogActivityParams,
	logActivity,
} from "@/features/activity-log/server/activity-log";
import { logger } from "@/logger.ts";

/** Best-effort: a failed audit must not roll back a valid registration. */
export async function recordMcpClientActivity(
	params: LogActivityParams,
): Promise<void> {
	try {
		await logActivity(params);
	} catch (error) {
		logger.error("[mcp] failed to record CIMD audit entry:", error);
	}
}
