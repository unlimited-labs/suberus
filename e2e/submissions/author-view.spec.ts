import { test, expect, createUniqueSubmission, SubmissionPage } from "./fixtures";

test.describe("Author - My Submissions List", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate and wait for full page load with auth
		await page.goto("/submissions");
		// Wait for either the heading (authenticated) or redirect to login
		await Promise.race([
			expect(page.getByRole("heading", { name: "Submissions" })).toBeVisible({ timeout: 20000 }),
			page.waitForURL(/\/login/, { timeout: 20000 }),
		]);
		// If redirected to login, fail early with clear message
		if (page.url().includes("/login")) {
			throw new Error("Auth failed - redirected to login. Check storageState.");
		}
	});

	test("displays submissions page with New Submission button", async ({ page }) => {
		// Assert - page heading and button are visible
		await expect(page.getByRole("heading", { name: "Submissions" })).toBeVisible();
		await expect(page.getByRole("link", { name: "New Submission", exact: true })).toBeVisible();
	});

	test("shows empty state or submissions list after loading", async ({ page }) => {
		await page.waitForLoadState("networkidle");

		// Either shows empty state, table, or cards
		const hasTable = await page.locator("table").isVisible().catch(() => false);
		const hasCards = await page.locator("[class*='rounded-2xl']").first().isVisible().catch(() => false);
		const hasEmptyState = await page.getByText(/No submissions yet/i).isVisible().catch(() => false);

		// At least one content type should be visible
		expect(hasTable || hasCards || hasEmptyState).toBeTruthy();
	});

	test("clicking New Submission navigates to form", async ({ page }) => {
		// Act
		await page.getByRole("link", { name: "New Submission", exact: true }).click();
		await page.waitForURL("/submissions/new", { timeout: 15000 });

		// Assert
		await expect(page.getByLabel("Title")).toBeVisible({ timeout: 10000 });
	});
});

test.describe("Author - Submission Detail View", () => {
	test("can view submission detail after creation", async ({ page }) => {
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		// Create a submission first
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();

		// Wait for redirect to detail page
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Verify we're on detail page
		await expect(page.getByText(uniqueSubmission.title)).toBeVisible();
	});

	test("submission detail shows tabs (Overview, Authors, History)", async ({ page }, testInfo) => {
		// Skip on mobile - tabs may be displayed differently
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Tabs should be visible
		await expect(page.getByRole("tab", { name: /Overview/i })).toBeVisible();
		await expect(page.getByRole("tab", { name: /Authors/i })).toBeVisible();
		await expect(page.getByRole("tab", { name: /History/i })).toBeVisible();
	});

	test("submission detail shows status", async ({ page }, testInfo) => {
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Status should be shown somewhere on the page (Submitted for new submissions)
		// On mobile, status is in MobileSidebar (lg:hidden), on desktop in StatusCard (hidden lg:block)
		if (testInfo.project.name.includes("mobile")) {
			// On mobile, the MobileSidebar (lg:hidden) contains the status
			const mobileSidebar = page.locator(".lg\\:hidden");
			await expect(mobileSidebar.getByText(/Submitted/i)).toBeVisible();
		} else {
			// On desktop, the StatusCard in the sticky sidebar is visible
			await expect(page.getByText(/Submitted/i).first()).toBeVisible();
		}
	});

	test("can switch to Authors tab and see author info", async ({ page }, testInfo) => {
		// Skip on mobile - tabs may be displayed differently
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Click Authors tab
		await page.getByRole("tab", { name: /Authors/i }).click();
		await page.waitForLoadState("networkidle");

		// Should see author name (first name and last name together)
		const fullName = `${uniqueSubmission.authors[0].firstName} ${uniqueSubmission.authors[0].lastName}`;
		await expect(page.getByText(fullName)).toBeVisible();
	});

	test("can switch to History tab and see status history", async ({ page }, testInfo) => {
		// Skip on mobile - tabs may be displayed differently
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Click History tab
		await page.getByRole("tab", { name: /History/i }).click();
		await page.waitForLoadState("networkidle");

		// Should see at least "Submitted" in history timeline
		await expect(page.getByText(/Submitted/i).first()).toBeVisible();
	});

	test("back button navigates to submissions list", async ({ page }) => {
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Click back button
		await page.getByRole("link", { name: /Back/i }).click();
		await page.waitForURL("/submissions");

		// Should be on submissions list
		await expect(page.getByRole("heading", { name: "Submissions" })).toBeVisible();
	});

	test("submission appears in list after creation", async ({ page }, testInfo) => {
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Navigate to list
		await page.goto("/submissions");
		await page.waitForLoadState("networkidle");
		await expect(page.getByText(/Loading submissions/i)).not.toBeVisible({ timeout: 10000 });

		// Submission should appear in the list
		// On mobile, cards (md:hidden) are shown; on desktop, table (hidden md:block) is shown
		if (testInfo.project.name.includes("mobile")) {
			// On mobile, look in the cards container
			const mobileCards = page.locator(".md\\:hidden");
			await expect(mobileCards.getByText(uniqueSubmission.title)).toBeVisible();
		} else {
			// On desktop, look in the table
			await expect(page.getByText(uniqueSubmission.title).first()).toBeVisible();
		}
	});
});

test.describe("Author - Submission Keywords", () => {
	test("keywords are displayed in submission detail", async ({ page }) => {
		const submissionPage = new SubmissionPage(page);
		const uniqueSubmission = createUniqueSubmission();

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.submit();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		await page.waitForLoadState("networkidle");

		// Keywords should be visible (as badges) - check first keyword
		await expect(page.getByText(uniqueSubmission.keywords[0])).toBeVisible();
	});
});
