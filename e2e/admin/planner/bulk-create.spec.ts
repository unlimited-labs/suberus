import { test, expect } from "./fixtures";
import { createSubmission, getPrisma } from "../../helpers/test-db";
import { SubmissionStatus, SubmissionType } from "../../../src/generated/prisma/enums";

test.describe.serial("Planner — Bulk create session from selection", () => {
	test("creates a session from multiple selected submissions", async ({
		plannerPage,
		testRun,
		cleanup,
	}) => {
		const s1 = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Bulk1",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(s1.id);
		const s2 = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Bulk2",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(s2.id);

		await plannerPage.goto();
		await plannerPage.selectUnscheduled([s1.id, s2.id]);
		await expect(plannerPage.sidebarSelectionBar).toBeVisible();
		await expect(plannerPage.sidebarSelectionBar).toContainText("2 selected");

		await plannerPage.bulkCreateButton.click();
		await expect(plannerPage.createSessionDialog).toBeVisible();

		const name = `${testRun.testRunId}_BulkSession`;
		await plannerPage.page.getByTestId("create-session-name").fill(name);
		await plannerPage.page.getByTestId("create-session-submit").click();

		await expect(plannerPage.createSessionDialog).toBeHidden({
			timeout: 15000,
		});

		const db = getPrisma();
		await expect
			.poll(async () => {
				const s = await db.programSession.findFirst({
					where: { title: name },
					include: { presentations: true },
				});
				return s?.presentations.length ?? 0;
			}, { timeout: 10000 })
			.toBe(2);
	});

	test("shows inline error and blocks submit when title empty", async ({
		plannerPage,
		testRun,
		cleanup,
	}) => {
		const s1 = await createSubmission({
			testRunId: testRun.testRunId,
			title: "BulkEmpty",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(s1.id);

		await plannerPage.goto();
		await plannerPage.selectUnscheduled([s1.id]);
		await plannerPage.bulkCreateButton.click();
		await expect(plannerPage.createSessionDialog).toBeVisible();

		const nameInput = plannerPage.page.getByTestId("create-session-name");
		await expect(nameInput).toBeFocused();

		await plannerPage.page.getByTestId("create-session-submit").click();
		await expect(plannerPage.createSessionDialog).toBeVisible();
		await expect(nameInput).toHaveAttribute("aria-invalid", "true");
		await expect(
			plannerPage.createSessionDialog.getByText("Title is required"),
		).toBeVisible();

		const name = `${testRun.testRunId}_RecoveredSession`;
		await nameInput.fill(name);
		await plannerPage.page.getByTestId("create-session-submit").click();
		await expect(plannerPage.createSessionDialog).toBeHidden({
			timeout: 15000,
		});
	});
});
