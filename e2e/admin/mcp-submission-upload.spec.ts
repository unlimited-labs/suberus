import { readFileSync } from "node:fs";
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

function multipart(name: string, bytes: Buffer) {
	return {
		multipart: {
			file: { name, mimeType: "application/pdf", buffer: bytes },
		},
	};
}

test.describe("Upload link endpoint", () => {
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

	// The whole point of the token: a POST with no session attaches the file.
	test("an unauthenticated POST attaches the file", async ({
		request,
		testRun,
	}) => {
		const db = getPrisma();
		const submission = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Upload endpoint target",
			type: "FULL_PAPER",
			status: "DRAFT",
			withAuthor: true,
		});

		const response = await request.post(
			`/api/submissions/upload/${tokenFor(submission.id)}`,
			multipart("paper.pdf", readFileSync(FIXTURE)),
		);
		expect(response.status()).toBe(204);

		const stored = await db.submission.findUnique({
			where: { id: submission.id },
			include: { currentVersion: { include: { file: true } } },
		});
		expect(stored?.currentVersion?.fileId).toBeTruthy();
		expect(stored?.currentVersion?.file?.mimeType).toBe("application/pdf");
	});

	test("a tampered token is refused", async ({ request, testRun }) => {
		const submission = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Upload endpoint tampered",
			type: "FULL_PAPER",
			status: "DRAFT",
		});
		const token = tokenFor(submission.id);

		const response = await request.post(
			`/api/submissions/upload/${token.slice(0, -2)}xx`,
			multipart("paper.pdf", readFileSync(FIXTURE)),
		);
		expect(response.status()).toBe(403);
	});

	// Content, not extension: renaming a text file to .pdf must not get through.
	test("a file that is not what it claims is refused", async ({
		request,
		testRun,
	}) => {
		const submission = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Upload endpoint bad content",
			type: "FULL_PAPER",
			status: "DRAFT",
		});

		const response = await request.post(
			`/api/submissions/upload/${tokenFor(submission.id)}`,
			multipart("paper.pdf", Buffer.from("plain text pretending to be a pdf")),
		);
		expect(response.status()).toBe(400);
	});

	test("a submission already in review is refused", async ({
		request,
		testRun,
	}) => {
		const submission = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Upload endpoint submitted",
			type: "FULL_PAPER",
			status: "SUBMITTED",
		});

		const response = await request.post(
			`/api/submissions/upload/${tokenFor(submission.id)}`,
			multipart("paper.pdf", readFileSync(FIXTURE)),
		);
		expect(response.status()).toBe(409);
	});
});
