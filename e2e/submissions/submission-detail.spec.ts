import { test, expect } from "./fixtures";
import { createSubmission } from "../helpers/test-db";
import { SubmissionStatus } from "../../src/generated/prisma/enums";

test.describe("Submission Detail - Actions Card", () => {
	test.describe("Edit button for SUBMITTED status", () => {
		test("shows Edit Submission button for SUBMITTED status", async ({ page, testRun, cleanup }) => {
			// Arrange
			const { id } = await createSubmission({
				testRunId: testRun.testRunId,
				title: "Edit Button Test",
				status: SubmissionStatus.SUBMITTED,
			});
			cleanup.track(id);
			await page.goto(`/submissions/${id}`);

			// Assert - Edit button should be visible
			await expect(
				page.getByRole("button", { name: "Edit Submission" })
			).toBeVisible();
		});

		test("shows Withdraw button alongside Edit for SUBMITTED status", async ({
			page,
			testRun,
			cleanup,
		}) => {
			// Arrange
			const { id } = await createSubmission({
				testRunId: testRun.testRunId,
				title: "Withdraw Button Test",
				status: SubmissionStatus.SUBMITTED,
			});
			cleanup.track(id);
			await page.goto(`/submissions/${id}`);

			// Assert - both buttons should be visible
			await expect(
				page.getByRole("button", { name: "Edit Submission" })
			).toBeVisible();
			await expect(
				page.getByRole("button", { name: "Withdraw Submission" })
			).toBeVisible();
		});

		test("Edit button navigates to edit form", async ({ page, testRun, cleanup }) => {
			// Arrange
			const { id } = await createSubmission({
				testRunId: testRun.testRunId,
				title: "Edit Navigate Test",
				status: SubmissionStatus.SUBMITTED,
			});
			cleanup.track(id);
			await page.goto(`/submissions/${id}`);

			// Act - click Edit
			await page.getByRole("button", { name: "Edit Submission" }).click();

			// Assert - should navigate to edit page
			await page.waitForURL(/\/submissions\/[a-f0-9-]+\/edit/, { timeout: 10000 });
			await expect(page.getByLabel("Title")).toBeVisible();
		});
	});
});

test.describe("Submission Detail - Info Card", () => {
	test("does not display Submission ID in info card", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "No Submission ID Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Assert
		await expect(page.getByText("Submission ID")).not.toBeVisible();
		await expect(page.getByText(id)).not.toBeVisible();
	});
});

test.describe("Submission Detail - Text Wrapping", () => {
	test("long words in abstract wrap correctly without horizontal scroll", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const longWord = "superlongwordwithoutanyspaces".repeat(10);
		const content = `Testing word wrap with: ${longWord}. This tests that the abstract container properly wraps extremely long words that don't have natural break points. The CSS break-words class should handle this case properly without causing horizontal overflow or expanding the page width beyond the viewport.`;
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Long Word Wrap Test",
			status: SubmissionStatus.SUBMITTED,
			content,
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Assert
		await expect(page.getByText(title)).toBeVisible();
		const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
		const clientWidth = await page.evaluate(() => document.body.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
	});

	test("long URLs in abstract wrap correctly", async ({ page, testRun, cleanup }) => {
		// Arrange
		const longUrl =
			"https://example.com/very/long/path/that/goes/on/and/on/without/stopping/for/many/characters/and/continues/further/with/more/segments/to/test/wrapping";
		const content = `This is test content for E2E testing. This abstract also contains a long URL: ${longUrl} that should wrap properly within the container. URLs are common in academic abstracts and the interface should handle them gracefully. Additional padding to meet minimum requirements.`.repeat(2);
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Long URL Wrap Test",
			status: SubmissionStatus.SUBMITTED,
			content,
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Assert
		await expect(page.getByText(longUrl.slice(0, 50))).toBeVisible();
		const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
		const clientWidth = await page.evaluate(() => document.body.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
	});

	test("multiple long words in abstract all wrap correctly", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const longWords = Array(5)
			.fill(0)
			.map((_, i) => `verylongword${i}withoutspaces`.repeat(5))
			.join(" separated by ");
		const content = `Testing multiple long words: ${longWords}. Each word should wrap independently without causing layout issues. This is an edge case that tests the CSS break-words functionality thoroughly.`;
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Multiple Long Words Test",
			status: SubmissionStatus.SUBMITTED,
			content,
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Assert
		await expect(page.getByText(title)).toBeVisible();
		const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
		const clientWidth = await page.evaluate(() => document.body.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
	});

	test("abstract with whitespace preserves line breaks", async ({ page, testRun, cleanup }) => {
		// Arrange
		const multilineContent = `First paragraph of the abstract with sufficient content to meet the minimum character requirements for validation. This paragraph contains detailed information about the research methodology and approach used in this study.

Second paragraph after a blank line - this tests whitespace-pre-line functionality in the submission detail view. We include additional context here to ensure the abstract meets length requirements while demonstrating proper line break handling.

Third paragraph to ensure multiple line breaks are preserved correctly in the submission detail view. The content should maintain its formatting as entered by the user. This additional text ensures we meet the 500 character minimum requirement for abstract content and validates the CSS whitespace-pre-line property is working correctly.`;
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Multiline Content Test",
			status: SubmissionStatus.SUBMITTED,
			content: multilineContent,
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Assert
		await expect(page.getByText("First paragraph")).toBeVisible();
		await expect(page.getByText("Second paragraph")).toBeVisible();
		await expect(page.getByText("Third paragraph")).toBeVisible();
	});
});

test.describe("Submission Detail - Authors in Overview", () => {
	test("authors are displayed in Overview tab", async ({ page, testRun, cleanup }, testInfo) => {
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Author Display Test",
			status: SubmissionStatus.SUBMITTED,
			authorData: { firstName: "John", lastName: "Doe" },
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Assert
		await expect(page.getByRole("tab", { name: /Overview/i })).toHaveAttribute("data-state", "active");
		await expect(page.getByText("John Doe")).toBeVisible();
	});

	test("Authors section header is visible in Overview", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Authors Header Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Assert
		const contentCard = page.locator(".rounded-2xl.bg-card").first();
		await expect(contentCard.getByText("Authors", { exact: true })).toBeVisible();
	});

	test("presenter author shows star icon", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Presenter Star Test",
			status: SubmissionStatus.SUBMITTED,
			authorData: { firstName: "John", lastName: "Doe" },
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Assert
		const authorRow = page.locator(".space-y-1 > div").filter({
			hasText: "John",
		});
		await expect(authorRow.locator("svg")).toBeVisible();
	});

	test("author affiliation is displayed", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Affiliation Display Test",
			status: SubmissionStatus.SUBMITTED,
			authorData: { firstName: "John", lastName: "Doe", affiliationName: "Test University" },
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Assert
		await expect(page.getByText("Test University")).toBeVisible();
	});

	test("multiple authors are all displayed in Overview", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Multiple Authors Test",
			status: SubmissionStatus.SUBMITTED,
			authorData: { firstName: "John", lastName: "Doe" },
			extraAuthors: [
				{ firstName: "Jane", lastName: "Smith", affiliationName: "Another University" },
			],
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Assert
		await expect(page.getByText("John Doe")).toBeVisible();
		await expect(page.getByText("Jane Smith")).toBeVisible();
	});

	test("only one tab exists for authors (no separate Authors tab)", async ({ page, testRun, cleanup }, testInfo) => {
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "No Authors Tab Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Assert
		await expect(page.getByRole("tab", { name: /Authors/i })).not.toBeVisible();
		await expect(page.getByRole("tab", { name: /Overview/i })).toBeVisible();
		await expect(page.getByRole("tab", { name: /History/i })).toBeVisible();
	});
});

test.describe("Submission Detail - Tabs Visibility", () => {
	test("tabs have visible border in light mode", async ({ page, testRun, cleanup }, testInfo) => {
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Tab Border Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await page.emulateMedia({ colorScheme: "light" });
		await page.goto(`/submissions/${id}`);

		// Assert
		const tabList = page.getByRole("tablist");
		await expect(tabList).toBeVisible();
		const borderStyle = await tabList.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return style.borderBottomWidth;
		});
		expect(Number.parseInt(borderStyle)).toBeGreaterThan(0);
	});

	test("inactive tabs have readable text in light mode", async ({ page, testRun, cleanup }, testInfo) => {
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Inactive Tab Text Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await page.emulateMedia({ colorScheme: "light" });
		await page.goto(`/submissions/${id}`);

		// Assert
		const historyTab = page.getByRole("tab", { name: /History/i });
		await expect(historyTab).toBeVisible();
		const opacity = await historyTab.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return Number.parseFloat(style.opacity);
		});
		expect(opacity).toBeGreaterThan(0.5);
	});

	test("active tab has visual distinction in light mode", async ({ page, testRun, cleanup }, testInfo) => {
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Active Tab Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await page.emulateMedia({ colorScheme: "light" });
		await page.goto(`/submissions/${id}`);

		// Assert
		const overviewTab = page.getByRole("tab", { name: /Overview/i });
		await expect(overviewTab).toHaveAttribute("data-state", "active");
		const tabState = await overviewTab.getAttribute("data-state");
		expect(tabState).toBe("active");
	});

	test("tabs work correctly in dark mode", async ({ page, testRun, cleanup }, testInfo) => {
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Dark Mode Tabs Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await page.emulateMedia({ colorScheme: "dark" });
		await page.goto(`/submissions/${id}`);

		// Act
		const historyTab = page.getByRole("tab", { name: /History/i });
		await expect(historyTab).toBeVisible();
		await historyTab.click();

		// Assert
		await expect(historyTab).toHaveAttribute("data-state", "active");
		const overviewTab = page.getByRole("tab", { name: /Overview/i });
		await overviewTab.click();
		await expect(overviewTab).toHaveAttribute("data-state", "active");
	});
});

test.describe("Submission Detail - Edge Cases", () => {
	test("handles special characters in abstract", async ({ page, testRun, cleanup }) => {
		// Arrange
		const specialChars = 'Test with special chars: <script>alert("xss")</script> & "quotes" & symbols: €£¥©®™';
		const content = `This is test content for E2E testing. ${specialChars} - This tests that special characters including HTML-like content, quotes, ampersands, and unicode symbols are properly escaped. Additional padding to meet minimum character requirements for submission.`.repeat(2);
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Special Chars Test",
			status: SubmissionStatus.SUBMITTED,
			content,
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Assert
		await expect(page.getByText("<script>")).toBeVisible();
		await expect(page.getByText("€£¥©®™")).toBeVisible();
	});

	test("keywords section is displayed properly", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Keywords Display Test",
			status: SubmissionStatus.SUBMITTED,
			keywords: ["testing", "e2e", "validation"],
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Assert
		const contentCard = page.locator(".rounded-2xl.bg-card").first();
		await expect(contentCard.getByText("Keywords", { exact: true })).toBeVisible();
		await expect(contentCard.getByText("testing", { exact: true })).toBeVisible();
	});

	test("handles author with long affiliation name", async ({ page, testRun, cleanup }) => {
		// Arrange
		const longAffiliation =
			"The Very Long University Name That Goes On And On With Department of Extended Studies";
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Long Affiliation Test",
			status: SubmissionStatus.SUBMITTED,
			authorData: { firstName: "John", lastName: "Doe", affiliationName: longAffiliation },
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Assert
		await expect(page.getByText(longAffiliation.slice(0, 30))).toBeVisible();
		const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
		const clientWidth = await page.evaluate(() => document.body.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
	});

	test("handles author with long name", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Long Name Test",
			status: SubmissionStatus.SUBMITTED,
			authorData: {
				firstName: "Bartholomew-Christopher",
				lastName: "Worthington-Pemberton-Smith",
			},
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Assert
		await expect(page.getByText("Bartholomew-Christopher")).toBeVisible();
		await expect(page.getByText("Worthington-Pemberton-Smith")).toBeVisible();
	});
});
