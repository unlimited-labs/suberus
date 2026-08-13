import path from "node:path";
import { fileURLToPath } from "node:url";
import { createUploadToken } from "@/features/submissions/server/upload-token";
import { expect, test } from "../helpers/base-fixtures";
import {
	createSubmission,
	getPrisma,
	setAppSetting,
	snapshotAppSettings,
} from "../helpers/test-db";

const FIXTURE = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../submissions/fixtures/document.pdf",
);

function tokenFor(submissionId: string) {
	const secret = process.env.AUTH_SECRET;
	if (!secret) throw new Error("AUTH_SECRET is required to mint an upload token");
	return createUploadToken({ submissionId, versionNumber: 1 }, secret).token;
}

test.describe("Upload link", () => {
	let restore: () => Promise<void>;

	test.beforeAll(async () => {
		const snap = await snapshotAppSettings(["SUBMISSION_TYPE_FULL_PAPER"]);
		restore = snap.restore;
		const existing = await getPrisma().appSetting.findUnique({
			where: { key: "SUBMISSION_TYPE_FULL_PAPER" },
		});
		await setAppSetting("SUBMISSION_TYPE_FULL_PAPER", {
			...((existing?.value ?? {}) as Record<string, unknown>),
			isActive: true,
			contentFormat: "FILE",
			allowedExtensions: ["pdf"],
		});
	});

	test.afterAll(async () => {
		await restore();
	});

	test("an author uploads the file without signing in", async ({
		page,
		testRun,
	}) => {
		const db = getPrisma();
		const submission = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Upload link target",
			type: "FULL_PAPER",
			status: "DRAFT",
			withAuthor: true,
		});

		// No storageState: the link has to work for someone with no session.
		await page.context().clearCookies();
		await page.goto(`/upload/${tokenFor(submission.id)}`);

		await expect(page.getByTestId("upload-title")).toContainText(
			"Upload link target",
		);
		await page.getByTestId("upload-input").setInputFiles(FIXTURE);
		await page.getByTestId("upload-submit").click();

		await expect(page.getByTestId("upload-done")).toBeVisible();

		const stored = await db.submission.findUnique({
			where: { id: submission.id },
			include: { currentVersion: { include: { file: true } } },
		});
		expect(stored?.currentVersion?.fileId).toBeTruthy();
		expect(stored?.currentVersion?.file?.mimeType).toBe("application/pdf");
	});

	test("a tampered link is refused", async ({ page, testRun }) => {
		const submission = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Upload link tampered",
			type: "FULL_PAPER",
			status: "DRAFT",
		});
		const token = tokenFor(submission.id);

		await page.goto(`/upload/${token.slice(0, -2)}xx`);

		await expect(page.getByTestId("upload-unavailable")).toBeVisible();
		await expect(page.getByTestId("upload-input")).toBeHidden();
	});
});
