import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { expect, test } from "../helpers/base-fixtures";
import { skipOnMobile } from "../helpers/skip-on-mobile";
import { getPrisma, getTestUserIds } from "../helpers/test-db";
import { TEST_USER } from "../helpers/test-users";
import { AdminUsersPage } from "./fixtures";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

/** The render path needs the docx-api sidecar (LibreOffice); skip READY checks when down. */
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

/** Pick a template in the per-user "Add document" dialog. */
async function selectUserDocTemplate(page: Page, name: string) {
	await page.getByTestId("document-template-select").click();
	await page.getByRole("option", { name }).click();
}

test.describe("Admin - Document generator", () => {
	test.describe.configure({ mode: "serial" });

	test.afterAll(async ({}, testInfo) => {
		const db = getPrisma(testInfo.parallelIndex);
		await db.generatedDocument
			.deleteMany({ where: { name: { contains: "e2e_" } } })
			.catch(() => {});
		await db.documentBatch.deleteMany({}).catch(() => {});
		await db.documentTemplate
			.deleteMany({ where: { name: { contains: "e2e_" } } })
			.catch(() => {});
	});

	test("template upload shows placeholder chips and rejects unknown tokens", async ({
		page,
		testRun,
	}) => {
		await page.goto("/admin/documents");
		await expect(
			page.getByRole("heading", { name: "Documents" }),
		).toBeVisible({ timeout: 15000 });

		const okName = testRun.prefix("Confirmation");
		await uploadTemplate(page, okName, "confirmation-template.docx");
		const row = page.getByTestId("template-row").filter({ hasText: okName });
		await expect(row).toBeVisible();
		await expect(row.getByText("{firstName}")).toBeVisible();
		await expect(row.getByText("{date}")).toBeVisible();

		// A template with an unsupported placeholder ({salary}) is rejected: the
		// dialog stays open, an error is shown, and no row is created.
		const badName = testRun.prefix("Bad");
		await page.getByTestId("upload-template-button").click();
		await page.getByTestId("template-name-input").fill(badName);
		await page
			.getByTestId("template-file-input")
			.setInputFiles(path.join(FIXTURES, "invalid-template.docx"));
		await page.getByTestId("template-upload-submit").click();

		// Rejected → the dialog stays open (server refused the unknown placeholder).
		await expect(page.getByTestId("template-name-input")).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(
			page.getByTestId("template-row").filter({ hasText: badName }),
		).toHaveCount(0);
	});

	test("single generation blocks on missing data, queues, then reaches READY", async ({
		page,
		testRun,
	}) => {
		const confirmName = testRun.prefix("Single");
		const visaName = testRun.prefix("Visa");

		await page.goto("/admin/documents");
		await uploadTemplate(page, confirmName, "confirmation-template.docx");
		await uploadTemplate(page, visaName, "visa-template.docx");

		const { testUserId } = await getTestUserIds();
		await page.goto(`/admin/users/${testUserId}`);
		await page.getByTestId("add-document-button").click();

		// Visa template uses {abstractTitle} (no accepted submission) → blocked.
		await selectUserDocTemplate(page, visaName);
		await expect(
			page.getByTestId("resolution-row").filter({ hasText: "abstract" }),
		).toContainText("Missing");
		await expect(page.getByTestId("generate-document-button")).toBeDisabled();

		// Confirmation template resolves fully → can generate.
		await selectUserDocTemplate(page, confirmName);
		await expect(page.getByTestId("generate-document-button")).toBeEnabled();
		await page.getByTestId("generate-document-button").click();

		const docRow = page
			.getByTestId("user-document-row")
			.filter({ hasText: confirmName });
		await expect(docRow).toBeVisible({ timeout: 15000 });

		if (await docxApiHealthy()) {
			await expect(docRow.getByTestId("doc-status-READY")).toBeVisible({
				timeout: 30000,
			});

			await loginAs(page, TEST_USER, { clearCookies: true });
			await page.goto("/documents");
			const myRow = page
				.getByTestId("my-document-row")
				.filter({ hasText: confirmName });
			await expect(myRow).toBeVisible({ timeout: 15000 });
			await expect(myRow.getByTestId("download-my-document")).toBeVisible();
		}
	});

	test("admin can delete a generated document", async ({ page, testRun }) => {
		const name = testRun.prefix("DeleteMe");
		await page.goto("/admin/documents");
		await uploadTemplate(page, name, "confirmation-template.docx");

		const { testUserId } = await getTestUserIds();
		await page.goto(`/admin/users/${testUserId}`);
		await page.getByTestId("add-document-button").click();
		await selectUserDocTemplate(page, name);
		await expect(page.getByTestId("generate-document-button")).toBeEnabled();
		await page.getByTestId("generate-document-button").click();

		const row = page
			.getByTestId("user-document-row")
			.filter({ hasText: name });
		await expect(row).toBeVisible({ timeout: 15000 });

		await row.getByLabel("Delete document").click();
		await page
			.getByRole("dialog")
			.getByRole("button", { name: "Delete", exact: true })
			.click();
		await expect(
			page.getByTestId("user-document-row").filter({ hasText: name }),
		).toHaveCount(0);
	});

	test("document stream routes validate id and existence", async ({ page }) => {
		const missing = "00000000-0000-4000-8000-000000000000";
		const doc = await page.request.get(`/api/documents/${missing}`);
		expect(doc.status()).toBe(404);
		const tpl = await page.request.get(`/api/documents/templates/${missing}`);
		expect(tpl.status()).toBe(404);
		const bad = await page.request.get("/api/documents/not-a-uuid");
		expect(bad.status()).toBe(400);
	});

	test("bulk generate document from the Users list", async ({
		page,
		testRun,
	}, testInfo) => {
		skipOnMobile(testInfo, "Bulk actions require the desktop table layout");
		const name = testRun.prefix("Bulk");
		await page.goto("/admin/documents");
		await uploadTemplate(page, name, "confirmation-template.docx");

		const usersPage = new AdminUsersPage(page);
		await usersPage.goto();
		await usersPage.waitForLoad();
		await usersPage.selectUser(TEST_USER);
		await usersPage.selectBulkAction("Generate document");

		// Dialog: pick template → review → generate → progress.
		await page.getByTestId("bulk-template-select").click();
		await page.getByRole("option", { name }).click();
		await page.getByTestId("bulk-review-button").click();
		await expect(page.getByText(/will be generated/)).toBeVisible();
		await page.getByTestId("bulk-generate-button").click();
		await expect(page.getByRole("button", { name: "Close" })).toBeVisible({
			timeout: 10000,
		});
	});
});
