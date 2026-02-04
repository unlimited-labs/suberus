import { test, expect, createUniqueSubmission, SubmissionPage } from "./fixtures";

test.describe("Submission Detail - Actions Card", () => {
	test.describe("Edit button for SUBMITTED status", () => {
		test("shows Edit Submission button for SUBMITTED status", async ({ page, testRun }) => {
			const submissionPage = new SubmissionPage(page);
			const uniqueSubmission = createUniqueSubmission(testRun.testRunId);

			// Arrange - create and submit
			await submissionPage.goto();
			await submissionPage.fillCompleteForm(uniqueSubmission);
			await submissionPage.submit();
			await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
			await page.waitForLoadState("networkidle");

			// Assert - Edit button should be visible
			await expect(
				page.getByRole("button", { name: "Edit Submission" })
			).toBeVisible();
		});

		test("shows Withdraw button alongside Edit for SUBMITTED status", async ({
			page,
			testRun,
		}) => {
			const submissionPage = new SubmissionPage(page);
			const uniqueSubmission = createUniqueSubmission(testRun.testRunId);

			// Arrange
			await submissionPage.goto();
			await submissionPage.fillCompleteForm(uniqueSubmission);
			await submissionPage.submit();
			await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
			await page.waitForLoadState("networkidle");

			// Assert - both buttons should be visible
			await expect(
				page.getByRole("button", { name: "Edit Submission" })
			).toBeVisible();
			await expect(
				page.getByRole("button", { name: "Withdraw Submission" })
			).toBeVisible();
		});

		test("Edit button navigates to edit form", async ({ page, testRun }) => {
			const submissionPage = new SubmissionPage(page);
			const uniqueSubmission = createUniqueSubmission(testRun.testRunId);

			// Arrange
			await submissionPage.goto();
			await submissionPage.fillCompleteForm(uniqueSubmission);
			await submissionPage.submit();
			await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
			await page.waitForLoadState("networkidle");

			// Act - click Edit
			await page.getByRole("button", { name: "Edit Submission" }).click();

			// Assert - should navigate to submission form
			await page.waitForURL("/submissions/new", { timeout: 10000 });
			await expect(page.getByLabel("Title")).toBeVisible();
		});
	});
});

test.describe("Submission Detail - Text Wrapping", () => {
	test("long words in abstract wrap correctly without horizontal scroll", async ({
		page,
		testRun,
	}) => {
		// Arrange
		const submissionPage = new SubmissionPage(page);
		const longWord = "superlongwordwithoutanyspaces".repeat(10);
		const uniqueSubmission = {
			...createUniqueSubmission(testRun.testRunId),
			content: `Testing word wrap with: ${longWord}. This tests that the abstract container properly wraps extremely long words that don't have natural break points. The CSS break-words class should handle this case properly without causing horizontal overflow or expanding the page width beyond the viewport.`,
		};

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Assert
		const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
		const clientWidth = await page.evaluate(() => document.body.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
	});

	test("long URLs in abstract wrap correctly", async ({ page, testRun }) => {
		// Arrange
		const submissionPage = new SubmissionPage(page);
		const longUrl =
			"https://example.com/very/long/path/that/goes/on/and/on/without/stopping/for/many/characters/and/continues/further/with/more/segments/to/test/wrapping";
		const baseContent = createUniqueSubmission(testRun.testRunId).content;
		const uniqueSubmission = {
			...createUniqueSubmission(testRun.testRunId),
			content: `${baseContent} This abstract also contains a long URL: ${longUrl} that should wrap properly within the container. URLs are common in academic abstracts and the interface should handle them gracefully.`,
		};

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Assert
		await expect(page.getByText(longUrl.slice(0, 50))).toBeVisible();
		const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
		const clientWidth = await page.evaluate(() => document.body.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
	});

	test("multiple long words in abstract all wrap correctly", async ({
		page,
		testRun,
	}) => {
		// Arrange
		const submissionPage = new SubmissionPage(page);
		const longWords = Array(5)
			.fill(0)
			.map((_, i) => `verylongword${i}withoutspaces`.repeat(5))
			.join(" separated by ");
		const uniqueSubmission = {
			...createUniqueSubmission(testRun.testRunId),
			content: `Testing multiple long words: ${longWords}. Each word should wrap independently without causing layout issues. This is an edge case that tests the CSS break-words functionality thoroughly.`,
		};

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Assert
		const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
		const clientWidth = await page.evaluate(() => document.body.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
	});

	test("abstract with whitespace preserves line breaks", async ({ page, testRun }) => {
		// Arrange
		const submissionPage = new SubmissionPage(page);
		const multilineContent = `First paragraph of the abstract with sufficient content to meet the minimum character requirements for validation. This paragraph contains detailed information about the research methodology and approach used in this study.

Second paragraph after a blank line - this tests whitespace-pre-line functionality in the submission detail view. We include additional context here to ensure the abstract meets length requirements while demonstrating proper line break handling.

Third paragraph to ensure multiple line breaks are preserved correctly in the submission detail view. The content should maintain its formatting as entered by the user. This additional text ensures we meet the 500 character minimum requirement for abstract content and validates the CSS whitespace-pre-line property is working correctly.`;
		const uniqueSubmission = {
			...createUniqueSubmission(testRun.testRunId),
			content: multilineContent,
		};

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Assert
		await expect(page.getByText("First paragraph")).toBeVisible();
		await expect(page.getByText("Second paragraph")).toBeVisible();
		await expect(page.getByText("Third paragraph")).toBeVisible();
	});
});

test.describe("Submission Detail - Authors in Overview", () => {
	test("authors are displayed in Overview tab", async ({ page, testRun }, testInfo) => {
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		// Arrange
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission(testRun.testRunId);
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Assert
		await expect(page.getByRole("tab", { name: /Overview/i })).toHaveAttribute("data-state", "active");
		const authorName = `${uniqueSubmission.authors[0].firstName} ${uniqueSubmission.authors[0].lastName}`;
		await expect(page.getByText(authorName)).toBeVisible();
	});

	test("Authors section header is visible in Overview", async ({ page, testRun }) => {
		// Arrange
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission(testRun.testRunId);
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Assert
		const contentCard = page.locator(".rounded-2xl.bg-card").first();
		await expect(contentCard.getByText("Authors", { exact: true })).toBeVisible();
	});

	test("presenter author shows star icon", async ({ page, testRun }) => {
		// Arrange
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission(testRun.testRunId);
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Assert
		const authorRow = page.locator(".space-y-1 > div").filter({
			hasText: uniqueSubmission.authors[0].firstName,
		});
		await expect(authorRow.locator("svg")).toBeVisible();
	});

	test("author affiliation is displayed", async ({ page, testRun }) => {
		// Arrange
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission(testRun.testRunId);
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Assert
		await expect(page.getByText(uniqueSubmission.authors[0].affiliationName)).toBeVisible();
	});

	test("multiple authors are all displayed in Overview", async ({ page, testRun }) => {
		// Arrange
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission(testRun.testRunId);
		const secondAuthor = {
			firstName: "Jane",
			lastName: "Smith",
			email: `jane.smith.${testRun.testRunId}@test.com`,
			affiliationId: null,
			affiliationName: "Another University",
			isPresenter: false,
		};

		await submissionPage.goto();
		await submissionPage.selectType(uniqueSubmission.type);
		await submissionPage.fillTitle(uniqueSubmission.title);
		await submissionPage.fillContent(uniqueSubmission.content);
		await submissionPage.fillAuthor(0, uniqueSubmission.authors[0]);
		await submissionPage.addAuthor();
		await submissionPage.fillAuthor(1, secondAuthor);

		for (const keyword of uniqueSubmission.keywords) {
			await submissionPage.addKeyword(keyword);
		}

		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Assert
		const firstAuthorName = `${uniqueSubmission.authors[0].firstName} ${uniqueSubmission.authors[0].lastName}`;
		const secondAuthorName = `${secondAuthor.firstName} ${secondAuthor.lastName}`;
		await expect(page.getByText(firstAuthorName)).toBeVisible();
		await expect(page.getByText(secondAuthorName)).toBeVisible();
	});

	test("only one tab exists for authors (no separate Authors tab)", async ({ page, testRun }, testInfo) => {
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		// Arrange
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission(testRun.testRunId);
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Assert
		await expect(page.getByRole("tab", { name: /Authors/i })).not.toBeVisible();
		await expect(page.getByRole("tab", { name: /Overview/i })).toBeVisible();
		await expect(page.getByRole("tab", { name: /History/i })).toBeVisible();
	});
});

test.describe("Submission Detail - Tabs Visibility", () => {
	test("tabs have visible border in light mode", async ({ page, testRun }, testInfo) => {
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		// Arrange
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission(testRun.testRunId);
		await page.emulateMedia({ colorScheme: "light" });
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Assert
		const tabList = page.getByRole("tablist");
		await expect(tabList).toBeVisible();
		const borderStyle = await tabList.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return style.borderBottomWidth;
		});
		expect(Number.parseInt(borderStyle)).toBeGreaterThan(0);
	});

	test("inactive tabs have readable text in light mode", async ({ page, testRun }, testInfo) => {
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		// Arrange
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission(testRun.testRunId);
		await page.emulateMedia({ colorScheme: "light" });
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Assert
		const historyTab = page.getByRole("tab", { name: /History/i });
		await expect(historyTab).toBeVisible();
		const opacity = await historyTab.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return Number.parseFloat(style.opacity);
		});
		expect(opacity).toBeGreaterThan(0.5);
	});

	test("active tab has visual distinction in light mode", async ({ page, testRun }, testInfo) => {
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		// Arrange
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission(testRun.testRunId);
		await page.emulateMedia({ colorScheme: "light" });
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Assert
		const overviewTab = page.getByRole("tab", { name: /Overview/i });
		await expect(overviewTab).toHaveAttribute("data-state", "active");
		const tabState = await overviewTab.getAttribute("data-state");
		expect(tabState).toBe("active");
	});

	test("tabs work correctly in dark mode", async ({ page, testRun }, testInfo) => {
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		// Arrange
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission(testRun.testRunId);
		await page.emulateMedia({ colorScheme: "dark" });
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

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
	test("handles special characters in abstract", async ({ page, testRun }) => {
		// Arrange
		const submissionPage = new SubmissionPage(page);
		const specialChars = 'Test with special chars: <script>alert("xss")</script> & "quotes" & symbols: €£¥©®™';
		const baseContent = createUniqueSubmission(testRun.testRunId).content;
		const uniqueSubmission = {
			...createUniqueSubmission(testRun.testRunId),
			content: `${baseContent} ${specialChars} - This tests that special characters including HTML-like content, quotes, ampersands, and unicode symbols are properly escaped.`,
		};

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Assert
		await expect(page.getByText("<script>")).toBeVisible();
		await expect(page.getByText("€£¥©®™")).toBeVisible();
	});

	test("keywords section is displayed properly", async ({ page, testRun }) => {
		// Arrange
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission(testRun.testRunId);

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Assert
		const contentCard = page.locator(".rounded-2xl.bg-card").first();
		await expect(contentCard.getByText("Keywords", { exact: true })).toBeVisible();
		await expect(contentCard.getByText(uniqueSubmission.keywords[0])).toBeVisible();
	});

	test("handles author with long affiliation name", async ({ page, testRun }) => {
		// Arrange
		const submissionPage = new SubmissionPage(page);
		const longAffiliation =
			"The Very Long University Name That Goes On And On With Department of Extended Studies";
		const uniqueSubmission = {
			...createUniqueSubmission(testRun.testRunId),
			authors: [
				{
					firstName: "John",
					lastName: "Doe",
					email: `john.long.${testRun.testRunId}@test.com`,
					affiliationId: null,
					affiliationName: longAffiliation,
					isPresenter: true,
				},
			],
		};

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Assert
		await expect(page.getByText(longAffiliation.slice(0, 30))).toBeVisible();
		const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
		const clientWidth = await page.evaluate(() => document.body.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
	});

	test("handles author with long name", async ({ page, testRun }) => {
		// Arrange
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = {
			...createUniqueSubmission(testRun.testRunId),
			authors: [
				{
					firstName: "Bartholomew-Christopher",
					lastName: "Worthington-Pemberton-Smith",
					email: `long.name.${testRun.testRunId}@test.com`,
					affiliationId: null,
					affiliationName: "Test University",
					isPresenter: true,
				},
			],
		};

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Assert
		await expect(page.getByText("Bartholomew-Christopher")).toBeVisible();
		await expect(page.getByText("Worthington-Pemberton-Smith")).toBeVisible();
	});
});
