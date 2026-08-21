import { test as base, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import { baseUrlFor } from "../../playwright.config";
import { deleteSubmission, getPrisma } from "./test-db";
import { dismissViteOverlay, suppressPasskeyNudge } from "./page-setup";

export interface TestRunContext {
	testRunId: string;
	prefix: (value: string) => string;
}

export interface CleanupContext {
	track: (submissionId: string) => void;
}

/** Per-project test options (settable via project `use`). */
export interface TestOptions {
	role: string | undefined;
}

export const test = base.extend<
	TestOptions & {
		testRun: TestRunContext;
		cleanup: CleanupContext;
	}
>({
	// Projects set `use: { role: "admin" }`; storageState resolves the worker's file.
	role: [undefined, { option: true }],

	baseURL: async ({}, use, testInfo) => {
		await use(baseUrlFor(testInfo.parallelIndex));
	},

	storageState: async ({ role }, use, testInfo) => {
		await use(role ? `e2e/.auth/${role}-${testInfo.parallelIndex}.json` : undefined);
	},

	page: async ({ page }, use) => {
		await dismissViteOverlay(page);
		await suppressPasskeyNudge(page);
		await use(page);
	},

	testRun: async ({}, use) => {
		const testRunId = `e2e_${randomUUID().slice(0, 8)}`;
		await use({
			testRunId,
			prefix: (value: string) => `${testRunId}_${value}`,
		});
	},

	cleanup: async ({ testRun }, use, testInfo) => {
		const trackedIds: string[] = [];

		await use({
			track: (id: string) => trackedIds.push(id),
		});

		const db = getPrisma(testInfo.parallelIndex);
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
