import { expect } from "@playwright/test";
import { test, ADMIN_USER } from "./fixtures";
import { clearMailpitForAddress, waitForEmail, getMailpitMessage } from "../helpers/mailpit";
import { getPrisma, setAppSetting } from "../helpers/test-db";

/** Find a template card by its description text and click its edit button */
async function openTemplateEditor(
	page: import("@playwright/test").Page,
	descriptionText: string,
) {
	// Each card is a row with: [icon + text block] ... [edit button]
	// The text block contains the description. We find the card then click its button.
	const card = page
		.locator("div.space-y-3 > div")
		.filter({ hasText: descriptionText });
	await card.getByRole("button").click();
}

test.describe("Admin Settings - Email Templates", () => {
	test.beforeEach(async ({ adminSettingsPage }, testInfo) => {
		// Arrange
		await adminSettingsPage.goto();
		if (testInfo.project.name === "mobile-admin") {
			await adminSettingsPage.page.getByRole("tab").nth(4).click();
		} else {
			await adminSettingsPage.page
				.getByRole("tab", { name: /Email Templates/i })
				.click();
		}
		await expect(
			adminSettingsPage.page.getByRole("heading", {
				name: "Email Templates",
			}),
		).toBeVisible();
	});

	test("displays email templates from database", async ({ page }) => {
		// Assert - seeded templates descriptions should be visible
		await expect(
			page.getByText("Sent when a new submission is created"),
		).toBeVisible();
		await expect(
			page.getByText("Sent when a reviewer is assigned to a submission"),
		).toBeVisible();
		await expect(
			page.getByText("Sent when a submission is accepted"),
		).toBeVisible();
		await expect(
			page.getByText("Sent when a submission is rejected"),
		).toBeVisible();
	});

	test("shows active/disabled badges", async ({ page }) => {
		// Assert - all seeded templates are enabled
		const activeBadges = page.locator("[data-slot='badge']", {
			hasText: "Active",
		});
		await expect(activeBadges.first()).toBeVisible();
	});

	test("can open edit dialog for template", async ({ page }) => {
		// Act
		await openTemplateEditor(
			page,
			"Sent when a new submission is created",
		);

		// Assert
		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();
		await expect(dialog.getByLabel("Subject")).toBeVisible();
		await expect(dialog.getByLabel("Body")).toBeVisible();
		await expect(dialog.getByLabel("CC", { exact: true })).toBeVisible();
		await expect(dialog.getByLabel("BCC", { exact: true })).toBeVisible();
		await expect(dialog.getByLabel("Active")).toBeVisible();
		await expect(dialog.getByText("Available placeholders")).toBeVisible();
	});

	test("can edit and save email template subject", async ({ page }) => {
		// Arrange
		await openTemplateEditor(
			page,
			"Sent when a new submission is created",
		);

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		// Act - modify subject
		const subjectInput = dialog.getByLabel("Subject");
		const originalSubject = await subjectInput.inputValue();
		const newSubject = `${originalSubject} [EDITED]`;
		await subjectInput.clear();
		await subjectInput.fill(newSubject);

		// Save
		await dialog.getByRole("button", { name: "Save" }).click();

		// Assert - success toast
		await expect(page.getByText(/saved/i)).toBeVisible();

		// Assert - dialog closed
		await expect(dialog).not.toBeVisible();

		// Assert - updated subject visible in card
		await expect(page.getByText(newSubject)).toBeVisible();

		// Cleanup - restore original subject
		const db = getPrisma();
		await db.emailTemplate.update({
			where: { eventType: "SUBMISSION_RECEIVED" },
			data: { subject: originalSubject },
		});
	});

	test("can toggle template enabled state", async ({ page }) => {
		// Arrange - get initial state
		const db = getPrisma();
		const template = await db.emailTemplate.findUnique({
			where: { eventType: "DEADLINE_APPROACHING" },
		});
		const originalEnabled = template!.isEnabled;

		// Act
		await openTemplateEditor(
			page,
			"Sent when a deadline is approaching",
		);

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		await dialog.getByLabel("Active").click();
		await dialog.getByRole("button", { name: "Save" }).click();

		// Assert
		await expect(page.getByText(/saved/i)).toBeVisible();

		// Verify DB
		const updated = await db.emailTemplate.findUnique({
			where: { eventType: "DEADLINE_APPROACHING" },
		});
		expect(updated!.isEnabled).toBe(!originalEnabled);

		// Cleanup - restore
		await db.emailTemplate.update({
			where: { eventType: "DEADLINE_APPROACHING" },
			data: { isEnabled: originalEnabled },
		});
	});

	test("can edit CC and BCC fields", async ({ page }) => {
		// Arrange
		await openTemplateEditor(
			page,
			"Sent when a new user account is created",
		);

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		// Act
		const ccInput = dialog.getByLabel("CC", { exact: true });
		const bccInput = dialog.getByLabel("BCC", { exact: true });
		await ccInput.clear();
		await ccInput.fill("cc-test@example.com");
		await bccInput.clear();
		await bccInput.fill("bcc1@example.com, bcc2@example.com");
		await dialog.getByRole("button", { name: "Save" }).click();

		// Assert
		await expect(page.getByText(/saved/i)).toBeVisible();

		// Verify DB
		const db = getPrisma();
		const updated = await db.emailTemplate.findUnique({
			where: { eventType: "ACCOUNT_CREATED" },
		});
		expect(updated!.ccEmails).toEqual(["cc-test@example.com"]);
		expect(updated!.bccEmails).toEqual([
			"bcc1@example.com",
			"bcc2@example.com",
		]);

		// Cleanup
		await db.emailTemplate.update({
			where: { eventType: "ACCOUNT_CREATED" },
			data: { ccEmails: [], bccEmails: [] },
		});
	});
});

test.describe("Admin Settings - Email Footer", () => {
	test.beforeEach(async ({ adminSettingsPage }, testInfo) => {
		// Arrange
		await adminSettingsPage.goto();
		if (testInfo.project.name === "mobile-admin") {
			await adminSettingsPage.page.getByRole("tab").nth(4).click();
		} else {
			await adminSettingsPage.page
				.getByRole("tab", { name: /Email Templates/i })
				.click();
		}
		await expect(
			adminSettingsPage.page.getByRole("heading", {
				name: "Email Templates",
			}),
		).toBeVisible();
	});

	test("admin can configure email footer", async ({ page }) => {
		// Arrange
		const footerText = "Best regards,\nConference Committee";

		// Act
		const footerTextarea = page.getByLabel("Footer text");
		await expect(footerTextarea).toBeVisible();
		await footerTextarea.clear();
		await footerTextarea.fill(footerText);
		await page.getByRole("button", { name: "Save Footer" }).click();

		// Assert
		await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });

		// Cleanup
		await setAppSetting(
			"EMAIL_FOOTER_TEXT" as Parameters<typeof setAppSetting>[0],
			"",
		);
	});
});

test.describe("Admin Settings - Placeholder Tooltips & Test Email", () => {
	test.describe.configure({ mode: "serial" });

	test.beforeEach(async ({ adminSettingsPage }, testInfo) => {
		// Arrange
		await adminSettingsPage.goto();
		if (testInfo.project.name === "mobile-admin") {
			await adminSettingsPage.page.getByRole("tab").nth(4).click();
		} else {
			await adminSettingsPage.page
				.getByRole("tab", { name: /Email Templates/i })
				.click();
		}
		await expect(
			adminSettingsPage.page.getByRole("heading", {
				name: "Email Templates",
			}),
		).toBeVisible();
	});

	test("shows tooltip on placeholder badge hover", async ({ page }, testInfo) => {
		// Tooltips don't work on mobile (no hover)
		test.skip(testInfo.project.name === "mobile-admin", "No hover on mobile");

		// Arrange
		await openTemplateEditor(
			page,
			"Sent when a new submission is created",
		);
		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		// Act - hover over a placeholder badge
		const badge = dialog.getByText("submissionTitle", { exact: true });
		await badge.hover();

		// Assert
		await expect(
			page.getByRole("tooltip", { name: "Title of the submission" }),
		).toBeVisible();
	});

	test("sends test email with placeholder data", async ({ page }) => {
		// Arrange
		await clearMailpitForAddress(ADMIN_USER.email);
		await openTemplateEditor(
			page,
			"Sent when a new submission is created",
		);
		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		// Act
		await dialog.getByRole("button", { name: "Send Test" }).click();

		// Assert - success toast
		await expect(
			page.getByText(/test email sent/i),
		).toBeVisible({ timeout: 15000 });

		// Assert - email received in Mailpit
		const email = await waitForEmail(
			ADMIN_USER.email,
			"[TEST]",
			15000,
		);
		expect(email).not.toBeNull();
		expect(email!.Subject).toContain("[TEST]");

		// Assert - placeholders replaced with example data
		const emailDetails = await getMailpitMessage(email!.ID);
		expect(emailDetails).not.toBeNull();
		expect(emailDetails!.Text).toContain("John Doe");
		expect(emailDetails!.Text).toContain("Example Submission Title");
	});
});
