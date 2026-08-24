import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	createCapabilityToken,
	DOWNLOAD_LINK_TTL_MS,
	UPLOAD_LINK_TTL_MS,
} from "@/features/submissions/server/capability-token";
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

function secret() {
	const value = process.env.AUTH_SECRET;
	if (!value) throw new Error("AUTH_SECRET is required to mint a token");
	return value;
}

const uploadToken = (submissionId: string) =>
	createCapabilityToken("up", submissionId, secret(), UPLOAD_LINK_TTL_MS).token;

const downloadToken = (submissionId: string, ttl = DOWNLOAD_LINK_TTL_MS) =>
	createCapabilityToken("dl", submissionId, secret(), ttl).token;

test.describe("Download link endpoint", () => {
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

	async function submissionWithFile(testRunId: string, title: string) {
		const submission = await createSubmission({
			testRunId,
			title,
			type: "FULL_PAPER",
			status: "DRAFT",
			withAuthor: true,
		});
		return submission;
	}

	test("an unauthenticated GET returns the stored file", async ({
		request,
		testRun,
	}) => {
		const submission = await submissionWithFile(
			testRun.testRunId,
			"Download endpoint target",
		);
		const bytes = readFileSync(FIXTURE);
		await request.post(`/api/submissions/upload/${uploadToken(submission.id)}`, {
			multipart: {
				file: { name: "paper.pdf", mimeType: "application/pdf", buffer: bytes },
			},
		});

		const response = await request.get(
			`/api/submissions/download/${downloadToken(submission.id)}`,
		);

		expect(response.status()).toBe(200);
		expect(response.headers()["content-disposition"]).toContain("attachment");
		expect((await response.body()).length).toBe(bytes.length);
	});

	// The purpose segment exists for exactly this: an upload link must never
	// double as a way to read the file back.
	test("an upload token is refused on the download route", async ({
		request,
		testRun,
	}) => {
		const submission = await submissionWithFile(
			testRun.testRunId,
			"Download endpoint wrong purpose",
		);
		await request.post(`/api/submissions/upload/${uploadToken(submission.id)}`, {
			multipart: {
				file: {
					name: "paper.pdf",
					mimeType: "application/pdf",
					buffer: readFileSync(FIXTURE),
				},
			},
		});

		const response = await request.get(
			`/api/submissions/download/${uploadToken(submission.id)}`,
		);
		expect(response.status()).toBe(403);
	});

	test("an expired token is refused", async ({ request, testRun }) => {
		const submission = await submissionWithFile(
			testRun.testRunId,
			"Download endpoint expired",
		);

		const response = await request.get(
			`/api/submissions/download/${downloadToken(submission.id, -1)}`,
		);
		expect(response.status()).toBe(410);
	});

	test("a submission with no file is answered with 404", async ({
		request,
		testRun,
	}) => {
		const submission = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Download endpoint no file",
			type: "FULL_PAPER",
			status: "DRAFT",
		});

		const response = await request.get(
			`/api/submissions/download/${downloadToken(submission.id)}`,
		);
		expect(response.status()).toBe(404);
	});
});
