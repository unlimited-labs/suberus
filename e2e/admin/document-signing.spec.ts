import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { expect, test } from "../helpers/base-fixtures";
import { getPrisma, getTestUserIds } from "../helpers/test-db";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

/** Signing needs the docx-api sidecar (pyHanko); skip when it is unavailable. */
async function docxApiHealthy(): Promise<boolean> {
	const url = process.env.DOCX_API_URL;
	if (!url) return false;
	try {
		const res = await fetch(`${url.replace(/\/+$/, "")}/`);
		return res.ok;
	} catch {
		return false;
	}
}

async function uploadTemplate(page: Page, name: string, file: string) {
	await page.getByTestId("upload-template-button").click();
	await page.getByTestId("template-name-input").fill(name);
	await page
		.getByTestId("template-file-input")
		.setInputFiles(path.join(FIXTURES, file));
	await page.getByTestId("template-upload-submit").click();
	await expect(page.getByTestId("template-name-input")).toBeHidden();
}

test.describe("Admin - Document signing", () => {
	test.describe.configure({ mode: "serial" });

	test.beforeAll(async ({}, testInfo) => {
		test.skip(!(await docxApiHealthy()), "docx-api sidecar (pyHanko) unavailable");
		// Start clean so the cert-status assertions reflect this run.
		const db = getPrisma(testInfo.parallelIndex);
		await db.appSetting
			.deleteMany({ where: { key: "DOCUMENT_SIGNING" } })
			.catch(() => {});
	});

	test.afterAll(async ({}, testInfo) => {
		const db = getPrisma(testInfo.parallelIndex);
		// Disable signing so it doesn't bleed into other document specs on this worker.
		await db.appSetting
			.deleteMany({ where: { key: "DOCUMENT_SIGNING" } })
			.catch(() => {});
		await db.generatedDocument
			.deleteMany({ where: { name: { contains: "e2e_" } } })
			.catch(() => {});
		await db.documentTemplate
			.deleteMany({ where: { name: { contains: "e2e_" } } })
			.catch(() => {});
	});

	test("generate cert, enable, then produce a signed & verifiable document", async ({
		page,
		testRun,
	}, testInfo) => {
		await page.goto("/admin/settings?tab=documents");
		await expect(page.getByTestId("document-signing-section")).toBeVisible({
			timeout: 15000,
		});

		// Generate a self-signed certificate.
		await page.getByTestId("generate-cert-button").click();
		await expect(page.getByTestId("signing-cert-status")).toBeVisible({
			timeout: 30000,
		});
		await expect(page.getByTestId("signing-cert-subject")).toContainText("CN=");
		await expect(page.getByTestId("signing-cert-fingerprint")).toHaveText(
			/^[0-9a-f]{64}$/,
		);

		// Enable signing and confirm it persists across a reload.
		await page.getByTestId("signing-enabled-switch").click();
		await page.reload();
		await expect(page.getByTestId("signing-enabled-switch")).toHaveAttribute(
			"data-state",
			"checked",
		);

		// Generate a document for the test participant.
		const docName = testRun.prefix("Signed");
		await page.goto("/admin/documents");
		await uploadTemplate(page, docName, "confirmation-template.docx");

		const { testUserId } = await getTestUserIds();
		await page.goto(`/admin/users/${testUserId}`);
		await page.getByTestId("add-document-button").click();
		await page.getByTestId("document-template-select").click();
		await page.getByRole("option", { name: docName }).click();
		await expect(page.getByTestId("generate-document-button")).toBeEnabled();
		await page.getByTestId("generate-document-button").click();

		const row = page.getByTestId("user-document-row").filter({ hasText: docName });
		await expect(row).toBeVisible({ timeout: 15000 });
		await expect(row.getByTestId("doc-status-READY")).toBeVisible({
			timeout: 40000,
		});
		await expect(row.getByTestId("document-signed-badge")).toBeVisible();

		// The stored PDF carries a real PAdES signature.
		const db = getPrisma(testInfo.parallelIndex);
		const doc = await db.generatedDocument.findFirst({
			where: { name: docName },
			select: { id: true, signed: true },
		});
		expect(doc?.signed).toBe(true);
		const resp = await page.request.get(`/api/documents/${doc?.id}`);
		expect(resp.ok()).toBe(true);
		const pdf = await resp.body();
		const ascii = pdf.toString("latin1");
		expect(ascii).toContain("/ByteRange");
		expect(ascii).toContain("ETSI.CAdES.detached");

		// The public verification page confirms authenticity.
		await page.goto("/verify-document");
		await page.getByTestId("verify-file-input").setInputFiles({
			name: "signed.pdf",
			mimeType: "application/pdf",
			buffer: pdf,
		});
		await page.getByTestId("verify-submit").click();
		await expect(page.getByTestId("verify-verdict")).toHaveText("Authentic", {
			timeout: 30000,
		});
	});

	test("uploading an own .p12 switches the source to Uploaded", async ({
		page,
	}) => {
		await page.goto("/admin/settings?tab=documents");
		await page
			.getByTestId("signing-p12-file")
			.setInputFiles(path.join(FIXTURES, "e2e-signing.p12"));
		await page.getByLabel("Password").fill("e2epass");
		await page.getByTestId("upload-cert-button").click();

		const status = page.getByTestId("signing-cert-status");
		await expect(status).toBeVisible({ timeout: 30000 });
		await expect(status).toContainText("Uploaded");
		await expect(page.getByTestId("signing-cert-subject")).toContainText(
			"E2E Uploaded Cert",
		);
	});
});
