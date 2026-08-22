import { waitForEmail } from "../helpers/mailpit";
import { getPrisma } from "../helpers/test-db";
import {
	createExhibitorUser,
	decideExhibitor,
	deleteExhibitorUserByEmail,
	expect,
	loginAsExhibitor,
	resetExhibitorConfig,
	setExhibitorConfig,
	submitExhibitorApplication,
	test,
} from "./fixtures";

const createdEmails: string[] = [];

// Mutates the shared EXHIBITOR config — keep serial with save/restore in hooks.
test.describe.serial("Exhibitor without presentation", () => {
	test.beforeAll(async () => {
		await setExhibitorConfig({
			isActive: true,
			allowExhibitorPresentation: false,
		});
	});

	test.afterAll(async () => {
		for (const email of createdEmails) {
			await deleteExhibitorUserByEmail(email).catch(() => {});
		}
		await resetExhibitorConfig();
	});

	test("apply without presentation section → approve → no submission created", async ({
		page,
		adminPage,
		testRun,
	}) => {
		const email = `exhibitor-nopres-${testRun.testRunId}@e2e.local`;
		createdEmails.push(email);
		const companyName = testRun.prefix("NoTalk GmbH");
		await createExhibitorUser(email);

		await loginAsExhibitor(page, email);
		await expect(page.getByTestId("exhibitor-company-name")).toBeVisible();
		await expect(
			page.getByTestId("exhibitor-add-presentation"),
		).not.toBeVisible();
		await submitExhibitorApplication(page, companyName);

		await adminPage.goto("/admin/exhibitors");
		const row = adminPage
			.getByTestId("exhibitor-row")
			.filter({ visible: true, hasText: companyName });
		await expect(row).toBeVisible();
		await expect(row).toContainText("No presentation");
		await row.getByRole("link", { name: companyName }).click();
		await expect(
			adminPage.getByTestId("exhibitor-presentation"),
		).toContainText("No presentation");
		await decideExhibitor(adminPage, "approve", "Exhibitor without presentation");
		await expect(adminPage.getByTestId("exhibitor-decision")).toContainText(
			"Approved",
		);

		const db = getPrisma();
		const user = await db.user.findUniqueOrThrow({
			where: { email },
			select: { id: true },
		});
		expect(await db.submission.count({ where: { userId: user.id } })).toBe(0);
		const exhibitor = await db.exhibitor.findUniqueOrThrow({
			where: { userId: user.id },
			select: { status: true, submissionId: true },
		});
		expect(exhibitor.status).toBe("APPROVED");
		expect(exhibitor.submissionId).toBeNull();

		await adminPage.goto("/admin/submissions");
		await expect(
			adminPage.getByRole("heading", { name: "Submissions" }),
		).toBeVisible();
		await expect(adminPage.getByText(companyName)).not.toBeVisible();

		await page.reload();
		await expect(page.getByTestId("exhibitor-status")).toContainText(
			"Approved",
		);
		await expect(page.getByTestId("exhibitor-submit")).not.toBeVisible();
		await expect(page.getByTestId("exhibitor-company-name")).toBeDisabled();
	});

	test("apply → reject with reason → locked panel + rejection email", async ({
		page,
		adminPage,
		testRun,
	}) => {
		const email = `exhibitor-reject-${testRun.testRunId}@e2e.local`;
		createdEmails.push(email);
		const companyName = testRun.prefix("RejectCo Ltd");
		await createExhibitorUser(email);

		await loginAsExhibitor(page, email);
		await submitExhibitorApplication(page, companyName);

		await adminPage.goto("/admin/exhibitors");
		const row = adminPage
			.getByTestId("exhibitor-row")
			.filter({ visible: true, hasText: companyName });
		await expect(row).toBeVisible();
		await row.getByRole("link", { name: companyName }).click();
		await decideExhibitor(adminPage, "reject", "Capacity reached");
		await expect(adminPage.getByTestId("exhibitor-decision")).toContainText(
			"Not accepted",
		);

		const rejectionEmail = await waitForEmail(email, "not accepted", 20000);
		expect(rejectionEmail).not.toBeNull();
		expect(rejectionEmail?.Subject).toContain("not accepted");

		await page.reload();
		await expect(page.getByTestId("exhibitor-status")).toContainText(
			"Not accepted",
		);
		await expect(page.getByTestId("exhibitor-submit")).not.toBeVisible();
		await expect(page.getByTestId("exhibitor-company-name")).toBeDisabled();
	});
});
