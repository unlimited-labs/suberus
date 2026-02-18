import { test as base, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import { deleteSubmission, getPrisma } from "./test-db";
import { dismissViteOverlay } from "./page-setup";

export interface TestRunContext {
	testRunId: string;
	prefix: (value: string) => string;
}

export interface CleanupContext {
	track: (submissionId: string) => void;
}

export const test = base.extend<{
	testRun: TestRunContext;
	cleanup: CleanupContext;
}>({
	page: async ({ page }, use) => {
		await dismissViteOverlay(page);
		await use(page);
	},

	testRun: async ({}, use) => {
		const testRunId = `e2e_${randomUUID().slice(0, 8)}`;
		await use({
			testRunId,
			prefix: (value: string) => `${testRunId}_${value}`,
		});
	},

	cleanup: async ({ testRun }, use) => {
		const trackedIds: string[] = [];

		await use({
			track: (id: string) => trackedIds.push(id),
		});

		// afterEach - cleanup tracked + orphaned by prefix
		const db = getPrisma();
		for (const id of trackedIds) {
			await deleteSubmission(id).catch(() => {});
		}

		// Cleanup orphaned data by testRunId prefix
		const orphaned = await db.submission.findMany({
			where: { title: { startsWith: testRun.testRunId } },
			select: { id: true },
		});
		for (const sub of orphaned) {
			await deleteSubmission(sub.id).catch(() => {});
		}
	},
});

export { expect };
