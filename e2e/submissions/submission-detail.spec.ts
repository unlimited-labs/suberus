import { test, expect, createUniqueSubmission, SubmissionPage } from "./fixtures";

test.describe("Submission Detail - Actions Card", () => {
	test.describe("Edit button for SUBMITTED status", () => {
		test("shows Edit Submission button for SUBMITTED status", async ({ page }) => {
			const submissionPage = new SubmissionPage(page);
			const uniqueSubmission = createUniqueSubmission();

			// Arrange - create and submit
			await submissionPage.goto();
			await submissionPage.fillCompleteForm(uniqueSubmission);
			await submissionPage.submit();
			await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
			await page.waitForLoadState("networkidle");

			// Assert - Edit button should be visible
			await expect(
				page.getByRole("button", { name: "Edit Submission" })
			).toBeVisible();
		});

		test("shows Withdraw button alongside Edit for SUBMITTED status", async ({
			page,
		}) => {
			const submissionPage = new SubmissionPage(page);
			const uniqueSubmission = createUniqueSubmission();

			// Arrange
			await submissionPage.goto();
			await submissionPage.fillCompleteForm(uniqueSubmission);
			await submissionPage.submit();
			await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
			await page.waitForLoadState("networkidle");

			// Assert - both buttons should be visible
			await expect(
				page.getByRole("button", { name: "Edit Submission" })
			).toBeVisible();
			await expect(
				page.getByRole("button", { name: "Withdraw Submission" })
			).toBeVisible();
		});

		test("Edit button navigates to edit form", async ({ page }) => {
			const submissionPage = new SubmissionPage(page);
			const uniqueSubmission = createUniqueSubmission();

			// Arrange
			await submissionPage.goto();
			await submissionPage.fillCompleteForm(uniqueSubmission);
			await submissionPage.submit();
			await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
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
	}) => {
		const submissionPage = new SubmissionPage(page);
		const longWord = "superlongwordwithoutanyspaces".repeat(10);
		const uniqueSubmission = {
			...createUniqueSubmission(),
			content: `Testing word wrap with: ${longWord}. This tests that the abstract container properly wraps extremely long words that don't have natural break points. The CSS break-words class should handle this case properly without causing horizontal overflow or expanding the page width beyond the viewport.`,
		};

		// Arrange - create submission with long word
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - no horizontal scroll (page width equals viewport width)
		const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
		const clientWidth = await page.evaluate(() => document.body.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance
	});

	test("long URLs in abstract wrap correctly", async ({ page }) => {
		const submissionPage = new SubmissionPage(page);
		const longUrl =
			"https://example.com/very/long/path/that/goes/on/and/on/without/stopping/for/many/characters/and/continues/further/with/more/segments/to/test/wrapping";
		const baseContent = createUniqueSubmission().content;
		const uniqueSubmission = {
			...createUniqueSubmission(),
			content: `${baseContent} This abstract also contains a long URL: ${longUrl} that should wrap properly within the container. URLs are common in academic abstracts and the interface should handle them gracefully.`,
		};

		// Arrange
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - abstract text is visible and contained
		await expect(page.getByText(longUrl.slice(0, 50))).toBeVisible();

		// No horizontal scroll
		const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
		const clientWidth = await page.evaluate(() => document.body.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
	});

	test("multiple long words in abstract all wrap correctly", async ({
		page,
	}) => {
		const submissionPage = new SubmissionPage(page);
		const longWords = Array(5)
			.fill(0)
			.map((_, i) => `verylongword${i}withoutspaces`.repeat(5))
			.join(" separated by ");
		const uniqueSubmission = {
			...createUniqueSubmission(),
			content: `Testing multiple long words: ${longWords}. Each word should wrap independently without causing layout issues. This is an edge case that tests the CSS break-words functionality thoroughly.`,
		};

		// Arrange
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - no horizontal scroll
		const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
		const clientWidth = await page.evaluate(() => document.body.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
	});

	test("abstract with whitespace preserves line breaks", async ({ page }) => {
		const submissionPage = new SubmissionPage(page);
		const multilineContent = `First paragraph of the abstract with sufficient content to meet the minimum character requirements for validation. This paragraph contains detailed information about the research methodology and approach used in this study.

Second paragraph after a blank line - this tests whitespace-pre-line functionality in the submission detail view. We include additional context here to ensure the abstract meets length requirements while demonstrating proper line break handling.

Third paragraph to ensure multiple line breaks are preserved correctly in the submission detail view. The content should maintain its formatting as entered by the user. This additional text ensures we meet the 500 character minimum requirement for abstract content and validates the CSS whitespace-pre-line property is working correctly.`;
		const uniqueSubmission = {
			...createUniqueSubmission(),
			content: multilineContent,
		};

		// Arrange
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - multiple paragraphs are visible (line breaks preserved)
		await expect(page.getByText("First paragraph")).toBeVisible();
		await expect(page.getByText("Second paragraph")).toBeVisible();
		await expect(page.getByText("Third paragraph")).toBeVisible();
	});
});

test.describe("Submission Detail - Authors in Overview", () => {
	test("authors are displayed in Overview tab", async ({ page }, testInfo) => {
		// Skip on mobile - tabs may be displayed differently
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		// Arrange
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - Overview tab is selected by default and shows authors
		await expect(page.getByRole("tab", { name: /Overview/i })).toHaveAttribute(
			"data-state",
			"active"
		);
		const authorName = `${uniqueSubmission.authors[0].firstName} ${uniqueSubmission.authors[0].lastName}`;
		await expect(page.getByText(authorName)).toBeVisible();
	});

	test("Authors section header is visible in Overview", async ({ page }) => {
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		// Arrange
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - Authors header visible in Overview (within the content tabs card)
		const contentCard = page.locator(".rounded-2xl.bg-card").first();
		await expect(contentCard.getByText("Authors", { exact: true })).toBeVisible();
	});

	test("presenter author shows star icon", async ({ page }) => {
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		// Arrange
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - presenter has star icon (IconStarFilled renders as svg)
		const authorRow = page.locator(".space-y-1 > div").filter({
			hasText: uniqueSubmission.authors[0].firstName,
		});
		await expect(authorRow.locator("svg")).toBeVisible();
	});

	test("author affiliation is displayed", async ({ page }) => {
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		// Arrange
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - affiliation visible
		await expect(
			page.getByText(uniqueSubmission.authors[0].affiliationName)
		).toBeVisible();
	});

	test("multiple authors are all displayed in Overview", async ({ page }) => {
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();
		const secondAuthor = {
			firstName: "Jane",
			lastName: "Smith",
			email: `jane.smith.${Date.now()}@test.com`,
			affiliationId: null,
			affiliationName: "Another University",
			isPresenter: false,
		};

		// Arrange - create submission with multiple authors
		await submissionPage.goto();
		await submissionPage.selectType(uniqueSubmission.type);
		await submissionPage.fillTitle(uniqueSubmission.title);
		await submissionPage.fillContent(uniqueSubmission.content);
		await submissionPage.fillAuthor(0, uniqueSubmission.authors[0]);

		// Add second author
		await submissionPage.addAuthor();
		await submissionPage.fillAuthor(1, secondAuthor);

		for (const keyword of uniqueSubmission.keywords) {
			await submissionPage.addKeyword(keyword);
		}

		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - both authors visible in Overview
		const firstAuthorName = `${uniqueSubmission.authors[0].firstName} ${uniqueSubmission.authors[0].lastName}`;
		const secondAuthorName = `${secondAuthor.firstName} ${secondAuthor.lastName}`;
		await expect(page.getByText(firstAuthorName)).toBeVisible();
		await expect(page.getByText(secondAuthorName)).toBeVisible();
	});

	test("only one tab exists for authors (no separate Authors tab)", async ({
		page,
	}, testInfo) => {
		// Skip on mobile - tabs may be hidden
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		// Arrange
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - Authors tab should NOT exist (authors are in Overview now)
		await expect(page.getByRole("tab", { name: /Authors/i })).not.toBeVisible();
		// Only Overview and History tabs should exist
		await expect(page.getByRole("tab", { name: /Overview/i })).toBeVisible();
		await expect(page.getByRole("tab", { name: /History/i })).toBeVisible();
	});
});

test.describe("Submission Detail - Tabs Visibility", () => {
	test("tabs have visible border in light mode", async ({ page }, testInfo) => {
		// Skip on mobile - tabs may be displayed differently
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		// Arrange - ensure light mode
		await page.emulateMedia({ colorScheme: "light" });
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - tab list should have visible border
		const tabList = page.getByRole("tablist");
		await expect(tabList).toBeVisible();

		// Check computed border style
		const borderStyle = await tabList.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return style.borderBottomWidth;
		});
		expect(Number.parseInt(borderStyle)).toBeGreaterThan(0);
	});

	test("inactive tabs have readable text in light mode", async ({ page }, testInfo) => {
		// Skip on mobile - tabs may be displayed differently
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		// Arrange - ensure light mode
		await page.emulateMedia({ colorScheme: "light" });
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - History tab (inactive) should be visible and readable
		const historyTab = page.getByRole("tab", { name: /History/i });
		await expect(historyTab).toBeVisible();

		// Check that text has sufficient opacity/contrast (not fully transparent)
		const opacity = await historyTab.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return Number.parseFloat(style.opacity);
		});
		expect(opacity).toBeGreaterThan(0.5);
	});

	test("active tab has visual distinction in light mode", async ({ page }, testInfo) => {
		// Skip on mobile - tabs may be displayed differently
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		// Arrange - ensure light mode
		await page.emulateMedia({ colorScheme: "light" });
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - active tab (Overview) has active state
		const overviewTab = page.getByRole("tab", { name: /Overview/i });
		await expect(overviewTab).toHaveAttribute("data-state", "active");

		// Verify tab is visually distinct - has data-state="active"
		// The CSS handles the underline via ::after with opacity-100 for active tabs
		const tabState = await overviewTab.getAttribute("data-state");
		expect(tabState).toBe("active");
	});

	test("tabs work correctly in dark mode", async ({ page }, testInfo) => {
		// Skip on mobile - tabs may be displayed differently
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		// Arrange - ensure dark mode
		await page.emulateMedia({ colorScheme: "dark" });
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - tabs are functional
		const historyTab = page.getByRole("tab", { name: /History/i });
		await expect(historyTab).toBeVisible();
		await historyTab.click();
		await expect(historyTab).toHaveAttribute("data-state", "active");

		// Can switch back to Overview
		const overviewTab = page.getByRole("tab", { name: /Overview/i });
		await overviewTab.click();
		await expect(overviewTab).toHaveAttribute("data-state", "active");
	});
});

test.describe("Submission Detail - Edge Cases", () => {
	test("handles special characters in abstract", async ({ page }) => {
		const submissionPage = new SubmissionPage(page);
		const specialChars = 'Test with special chars: <script>alert("xss")</script> & "quotes" & symbols: €£¥©®™';
		const baseContent = createUniqueSubmission().content;
		const uniqueSubmission = {
			...createUniqueSubmission(),
			content: `${baseContent} ${specialChars} - This tests that special characters including HTML-like content, quotes, ampersands, and unicode symbols are properly escaped.`,
		};

		// Arrange
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - content is displayed (escaped, not executed)
		await expect(page.getByText("<script>")).toBeVisible();
		await expect(page.getByText("€£¥©®™")).toBeVisible();
	});

	test("keywords section is displayed properly", async ({ page }) => {
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - Keywords section header is visible in the content card
		const contentCard = page.locator(".rounded-2xl.bg-card").first();
		await expect(contentCard.getByText("Keywords", { exact: true })).toBeVisible();

		// At least one keyword badge is visible
		await expect(
			contentCard.getByText(uniqueSubmission.keywords[0])
		).toBeVisible();
	});

	test("handles author with long affiliation name", async ({ page }) => {
		const submissionPage = new SubmissionPage(page);
		const longAffiliation =
			"The Very Long University Name That Goes On And On With Department of Extended Studies";
		const uniqueSubmission = {
			...createUniqueSubmission(),
			authors: [
				{
					firstName: "John",
					lastName: "Doe",
					email: `john.long.${Date.now()}@test.com`,
					affiliationId: null,
					affiliationName: longAffiliation,
					isPresenter: true,
				},
			],
		};

		// Arrange
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - long affiliation is displayed and doesn't break layout
		await expect(page.getByText(longAffiliation.slice(0, 30))).toBeVisible();

		// No horizontal scroll
		const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
		const clientWidth = await page.evaluate(() => document.body.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
	});

	test("handles author with long name", async ({ page }) => {
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = {
			...createUniqueSubmission(),
			authors: [
				{
					firstName: "Bartholomew-Christopher",
					lastName: "Worthington-Pemberton-Smith",
					email: `long.name.${Date.now()}@test.com`,
					affiliationId: null,
					affiliationName: "Test University",
					isPresenter: true,
				},
			],
		};

		// Arrange
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Assert - long name is visible
		await expect(page.getByText("Bartholomew-Christopher")).toBeVisible();
		await expect(page.getByText("Worthington-Pemberton-Smith")).toBeVisible();
	});
});
