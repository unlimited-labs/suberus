import { expect } from "@playwright/test";
import { test } from "../admin/fixtures";
import {
	createSession,
	deleteSession,
	createSubmission,
	deleteSubmission,
} from "../helpers/test-db";

test.describe.serial("Admin - Session Assignment", () => {
	test("should show session dropdown for ABSTRACT submission", async ({
		page,
		testRun,
	}) => {
		// Arrange
		const sessionId = await createSession(testRun.testRunId, "Computer Vision");
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "CV Research",
			content: "Content about computer vision",
		});

		// Act
		await page.goto(`/admin/submissions/${submissionId}`);

		// Assert - wait for page load, session card visible
		await expect(page.getByText("Session Assignment")).toBeVisible();
		await expect(page.getByRole("combobox")).toBeVisible();

		// Cleanup
		await deleteSubmission(submissionId);
		await deleteSession(sessionId);
	});

	test("should not show session dropdown for POSTER submission", async ({
		page,
		testRun,
	}) => {
		// Arrange
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "POSTER",
			title: "Poster Research",
			content: "Content about posters",
		});

		// Act
		await page.goto(`/admin/submissions/${submissionId}`);
		// Wait for page to fully load (submission title visible)
		await expect(
			page.getByText(`${testRun.testRunId}_Poster Research`),
		).toBeVisible();

		// Assert - no session assignment section
		await expect(page.getByText("Session Assignment")).not.toBeVisible();

		// Cleanup
		await deleteSubmission(submissionId);
	});

	test("should not show session dropdown for FULL_PAPER submission", async ({
		page,
		testRun,
	}) => {
		// Arrange
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "FULL_PAPER",
			title: "Full Paper Research",
			content: "Content about full paper",
		});

		// Act
		await page.goto(`/admin/submissions/${submissionId}`);
		// Wait for page to fully load
		await expect(
			page.getByText(`${testRun.testRunId}_Full Paper Research`),
		).toBeVisible();

		// Assert - no session assignment section
		await expect(page.getByText("Session Assignment")).not.toBeVisible();

		// Cleanup
		await deleteSubmission(submissionId);
	});

	test("should assign session to submission", async ({ page, testRun }) => {
		// Arrange
		const sessionId = await createSession(testRun.testRunId, "NLP Research");
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "NLP Paper",
			content: "Content about natural language processing",
		});

		// Act
		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Session Assignment")).toBeVisible();
		await page.getByRole("combobox").click();
		await page
			.getByRole("option", { name: `${testRun.testRunId}_NLP Research` })
			.click();

		// Assert
		await expect(page.getByText("Session updated")).toBeVisible();

		// Cleanup
		await deleteSubmission(submissionId);
		await deleteSession(sessionId);
	});

	test("should change assigned session", async ({ page, testRun }) => {
		// Arrange
		const session1Id = await createSession(testRun.testRunId, "AI Session");
		const session2Id = await createSession(testRun.testRunId, "ML Session");
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "AI/ML Paper",
			content: "Content about AI and ML",
			sessionId: session1Id,
		});

		// Act
		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Session Assignment")).toBeVisible();
		await page.getByRole("combobox").click();
		await page
			.getByRole("option", { name: `${testRun.testRunId}_ML Session` })
			.click();

		// Assert
		await expect(page.getByText("Session updated")).toBeVisible();

		// Cleanup
		await deleteSubmission(submissionId);
		await deleteSession(session1Id);
		await deleteSession(session2Id);
	});

	test("should clear session assignment", async ({ page, testRun }) => {
		// Arrange
		const sessionId = await createSession(
			testRun.testRunId,
			"Robotics Session",
		);
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "Robotics Paper",
			content: "Content about robotics",
			sessionId,
		});

		// Act
		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Session Assignment")).toBeVisible();
		await page.getByRole("combobox").click();
		await page.getByRole("option", { name: "None" }).click();

		// Assert
		await expect(page.getByText("Session updated")).toBeVisible();

		// Cleanup
		await deleteSubmission(submissionId);
		await deleteSession(sessionId);
	});

	test("should load only active sessions in dropdown", async ({
		page,
		testRun,
	}) => {
		// Arrange
		const activeSessionId = await createSession(
			testRun.testRunId,
			"Active",
			undefined,
			true,
		);
		const inactiveSessionId = await createSession(
			testRun.testRunId,
			"Inactive",
			undefined,
			false,
		);
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "Test Paper",
			content: "Content",
		});

		// Act
		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Session Assignment")).toBeVisible();
		await page.getByRole("combobox").click();

		// Assert
		await expect(
			page.getByRole("option", { name: `${testRun.testRunId}_Active` }),
		).toBeVisible();
		await expect(
			page.getByRole("option", { name: `${testRun.testRunId}_Inactive` }),
		).not.toBeVisible();

		// Cleanup
		await deleteSubmission(submissionId);
		await deleteSession(activeSessionId);
		await deleteSession(inactiveSessionId);
	});
});
