import "../helpers/app-env";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DOCUMENT_UPLOAD_LINK_TTL_MS } from "@/features/documents/server/upload-link";
import { createCapabilityToken } from "@/shared/server/capability-token";
import { expect, test } from "../helpers/base-fixtures";
import { getPrisma, getTestUserIds } from "../helpers/test-db";

const FIXTURE = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../submissions/fixtures/document.pdf",
);

function tokenFor(meta: {
	userId: string;
	title: string;
	by: string;
	notify?: boolean;
}) {
	const secret = process.env.AUTH_SECRET;
	if (!secret) throw new Error("AUTH_SECRET is required to mint an upload token");
	const subject = Buffer.from(
		JSON.stringify({ signMode: "NONE", notify: false, ...meta }),
	).toString("base64url");
	return createCapabilityToken("dup", subject, secret, DOCUMENT_UPLOAD_LINK_TTL_MS)
		.token;
}

function multipart(bytes: Buffer) {
	return {
		multipart: {
			file: { name: "invoice.pdf", mimeType: "application/pdf", buffer: bytes },
		},
	};
}

test.describe("Document upload link endpoint", () => {
	test.afterAll(async ({}, testInfo) => {
		await getPrisma(testInfo.parallelIndex)
			.generatedDocument.deleteMany({ where: { name: { contains: "e2e_" } } })
			.catch(() => {});
	});

	test("an unauthenticated POST files the document against the participant", async ({
		request,
		testRun,
	}) => {
		const { testUserId, adminUserId } = await getTestUserIds();
		const title = testRun.prefix("LinkInvoice");

		const response = await request.post(
			`/api/documents/upload/${tokenFor({ userId: testUserId, title, by: adminUserId })}`,
			multipart(readFileSync(FIXTURE)),
		);
		expect(response.status()).toBe(204);

		const doc = await getPrisma().generatedDocument.findFirst({
			where: { userId: testUserId, name: title },
		});
		expect(doc?.templateId).toBeNull();
		expect(doc?.signMode).toBe("NONE");
	});

	test("a tampered token is refused", async ({ request, testRun }) => {
		const { testUserId, adminUserId } = await getTestUserIds();
		const token = tokenFor({
			userId: testUserId,
			title: testRun.prefix("Tampered"),
			by: adminUserId,
		});

		const response = await request.post(
			`/api/documents/upload/${token.slice(0, -2)}xx`,
			multipart(readFileSync(FIXTURE)),
		);
		expect(response.status()).toBe(403);
	});

	test("a submission upload token cannot file a document", async ({
		request,
	}) => {
		const secret = process.env.AUTH_SECRET ?? "";
		const wrongPurpose = createCapabilityToken(
			"up",
			"11111111-2222-3333-4444-555555555555",
			secret,
			DOCUMENT_UPLOAD_LINK_TTL_MS,
		).token;

		const response = await request.post(
			`/api/documents/upload/${wrongPurpose}`,
			multipart(readFileSync(FIXTURE)),
		);
		expect(response.status()).toBe(403);
	});

	test("a link for a since-deleted participant answers 404", async ({
		request,
		testRun,
	}) => {
		const { adminUserId } = await getTestUserIds();

		const response = await request.post(
			`/api/documents/upload/${tokenFor({
				userId: "00000000-0000-4000-8000-000000000000",
				title: testRun.prefix("Ghost"),
				by: adminUserId,
			})}`,
			multipart(readFileSync(FIXTURE)),
		);
		expect(response.status()).toBe(404);
	});

	test("a file that is not a pdf is refused", async ({ request, testRun }) => {
		const { testUserId, adminUserId } = await getTestUserIds();

		const response = await request.post(
			`/api/documents/upload/${tokenFor({
				userId: testUserId,
				title: testRun.prefix("NotAPdf"),
				by: adminUserId,
			})}`,
			multipart(Buffer.from("plain text pretending to be a pdf")),
		);
		expect(response.status()).toBe(400);
	});
});
