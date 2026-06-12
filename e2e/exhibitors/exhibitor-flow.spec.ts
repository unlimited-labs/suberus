import { RegisterPage } from "../auth/fixtures";
import { waitForEmail } from "../helpers/mailpit";
import {
	cleanupPlannerForRun,
	createRoom,
	getPrisma,
} from "../helpers/test-db";
import {
	decideExhibitor,
	deleteExhibitorUserByEmail,
	expect,
	resetExhibitorConfig,
	setExhibitorConfig,
	test,
} from "./fixtures";

const createdEmails: string[] = [];

// Mutates the shared EXHIBITOR config — keep serial with save/restore in hooks.
test.describe.serial("Exhibitor happy path", () => {
	test.beforeAll(async () => {
		await setExhibitorConfig({
			isActive: true,
			allowExhibitorPresentation: true,
			includeInPlanner: true,
		});
	});

	test.afterAll(async () => {
		for (const email of createdEmails) {
			await deleteExhibitorUserByEmail(email).catch(() => {});
		}
		await resetExhibitorConfig();
	});

	test("register → apply with presentation → approve → email, locked panel, planner pool", async ({
		page,
		adminPage,
		testRun,
	}) => {
		test.setTimeout(300_000); // full 3-step registration + apply + decision + planner
		const email = `exhibitor-${testRun.testRunId}@e2e.local`;
		createdEmails.push(email);
		const companyName = testRun.prefix("Acme Robotics");
		const talkTitle = testRun.prefix("Robots in action");

		// --- Register an exhibitor account via the public form ---
		const registerPage = new RegisterPage(page);
		await registerPage.goto();
		await expect(
			page.getByTestId("register-account-type-exhibitor"),
		).toBeVisible();
		await page.getByTestId("register-account-type-exhibitor").click();
		await registerPage.fillStep1({
			email,
			password: "ValidPassword123!",
			confirmPassword: "ValidPassword123!",
			firstName: "Eva",
			lastName: "Exhibitor",
			affiliation: "Test University",
		});
		await registerPage.clickContinue();
		await registerPage.fillStep2({
			country: "Poland",
			address: "Acme Org\n1 Main St",
		});
		await registerPage.clickContinue();
		await registerPage.fillStep3({ acceptTerms: true });
		await registerPage.clickCreateAccount();

		// Full page load lands on the exhibitor panel with the EXHIBITOR role
		await page.waitForURL(/\/exhibitor/, { timeout: 30000 });
		await expect(page.getByTestId("exhibitor-status")).toContainText(
			"Application not submitted",
		);

		// --- Fill the application incl. a company presentation ---
		await page.getByTestId("exhibitor-company-name").fill(companyName);
		await page
			.getByTestId("exhibitor-description")
			.fill("We build conference robots.");
		await page
			.getByTestId("exhibitor-website")
			.fill("https://acme.example.com");
		await page.getByTestId("exhibitor-package").fill("Gold package");
		await page.getByTestId("exhibitor-add-presentation").click();
		await page.getByTestId("exhibitor-presentation-title").fill(talkTitle);
		await page
			.getByTestId("exhibitor-presentation-content")
			.fill("A short talk about the robots we bring to the conference.");

		// Exactly one author — the first author card is the presenter by default
		const authorCard = page.getByTestId("author-card-0");
		await authorCard.getByLabel("First name").fill("Eva");
		await authorCard.getByLabel("Last name").fill("Exhibitor");
		await authorCard.getByLabel("Email").fill(email);
		const affiliationInput = authorCard.getByLabel("Affiliation");
		const affiliationOption = page
			.getByRole("option")
			.filter({ hasText: "Test University" })
			.first();
		await expect(async () => {
			await affiliationInput.fill("Test University");
			await expect(affiliationOption).toBeVisible();
			await affiliationOption.click();
			await expect(affiliationInput).toHaveValue("Test University");
		}).toPass({ timeout: 15000 });

		await page.getByTestId("exhibitor-submit").click();
		await expect(page.getByText("Application submitted")).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByTestId("exhibitor-status")).toContainText(
			"Awaiting decision",
		);
		await expect(page.getByTestId("exhibitor-submit")).toContainText(
			"Save changes",
		);

		// --- Admin: list shows the application; approve from the detail page ---
		await adminPage.goto("/admin/exhibitors");
		await expect(adminPage.getByTestId("exhibitors-table")).toBeVisible();
		const row = adminPage
			.getByTestId("exhibitor-row")
			.filter({ visible: true, hasText: companyName });
		await expect(row).toBeVisible();
		await expect(row).toContainText("Awaiting decision");
		await row.getByRole("link", { name: companyName }).click();
		await expect(
			adminPage.getByTestId("exhibitor-presentation"),
		).toContainText(talkTitle);
		await decideExhibitor(adminPage, "approve", "Welcome aboard");
		await expect(adminPage.getByTestId("exhibitor-decision")).toContainText(
			"Approved",
		);

		// --- Exhibitor receives the approval email ---
		const approvalEmail = await waitForEmail(email, "approved", 20000);
		expect(approvalEmail).not.toBeNull();
		expect(approvalEmail?.Subject).toContain("approved");

		// --- Exhibitor panel: approved + locked form ---
		await page.reload();
		await expect(page.getByTestId("exhibitor-status")).toContainText(
			"Approved",
		);
		await expect(page.getByTestId("exhibitor-submit")).not.toBeVisible();
		await expect(page.getByTestId("exhibitor-withdraw")).not.toBeVisible();
		await expect(page.getByTestId("exhibitor-company-name")).toBeDisabled();

		// --- Linked submission is ACCEPTED and lands in the planner pool ---
		const db = getPrisma();
		const exhibitor = await db.exhibitor.findFirstOrThrow({
			where: { user: { email } },
			select: { submissionId: true, status: true },
		});
		expect(exhibitor.status).toBe("APPROVED");
		expect(exhibitor.submissionId).not.toBeNull();
		const submission = await db.submission.findUniqueOrThrow({
			where: { id: exhibitor.submissionId as string },
			select: { status: true, type: true },
		});
		expect(submission.status).toBe("ACCEPTED");
		expect(submission.type).toBe("EXHIBITOR");

		// The planner grid needs at least one room to render
		await createRoom(testRun.testRunId, "ExhibitorRoom");
		try {
			await adminPage.goto("/admin/program-planner");
			await expect(
				adminPage.getByRole("heading", { name: "Program Planner" }),
			).toBeVisible({ timeout: 15000 });
			const poolRow = adminPage.getByTestId(
				`unscheduled-row-${exhibitor.submissionId}`,
			);
			await expect(poolRow).toBeVisible({ timeout: 15000 });
			await expect(poolRow).toContainText(talkTitle);
		} finally {
			await cleanupPlannerForRun(testRun.testRunId).catch(() => {});
		}
	});
});
