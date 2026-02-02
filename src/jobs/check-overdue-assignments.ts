/**
 * Cron job to mark overdue review assignments
 *
 * This script should be run periodically (e.g., every hour or daily)
 * to update assignment statuses when deadlines pass.
 *
 * Usage:
 * - Direct: npx tsx src/jobs/check-overdue-assignments.ts
 * - Via API endpoint: POST /api/cron/check-overdue (with secret)
 * - Via external scheduler (GitHub Actions, systemd timer, etc.)
 */

import { markOverdueAssignments } from "../utils/assignments.server";

export async function runOverdueCheck(): Promise<{
	success: boolean;
	markedCount: number;
	error?: string;
}> {
	try {
		const count = await markOverdueAssignments();
		console.log(`[check-overdue-assignments] Marked ${count} assignments as overdue`);
		return { success: true, markedCount: count };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error(`[check-overdue-assignments] Error: ${message}`);
		return { success: false, markedCount: 0, error: message };
	}
}

// Run directly if executed as script (ESM compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`;
if (isMainModule) {
	runOverdueCheck()
		.then((result) => {
			console.log("Result:", result);
			process.exit(result.success ? 0 : 1);
		})
		.catch((error) => {
			console.error("Fatal error:", error);
			process.exit(1);
		});
}
