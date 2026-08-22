import { expect } from "@playwright/test";
import { test } from "../admin/fixtures";
import {
	createTrack,
	deleteTrack,
	createSubmission,
	deleteSubmission,
} from "../helpers/test-db";

test.describe.serial("Admin - Track Assignment", () => {
	test("should show track dropdown for ABSTRACT submission", async ({
		page,
		testRun,
	}) => {
		const trackId = await createTrack(testRun.testRunId, "Computer Vision");
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "CV Research",
			content: "Content about computer vision",
		});

		await page.goto(`/admin/submissions/${submissionId}`);

		await expect(page.getByText("Track", { exact: true })).toBeVisible();
		await expect(page.getByRole("combobox")).toBeVisible();

		await deleteSubmission(submissionId);
		await deleteTrack(trackId);
	});

	test("should not show track dropdown for POSTER submission", async ({
		page,
		testRun,
	}) => {
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "POSTER",
			title: "Poster Research",
			content: "Content about posters",
		});

		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(
			page.getByText(`${testRun.testRunId}_Poster Research`),
		).toBeVisible();

		await expect(page.getByText("Track", { exact: true })).not.toBeVisible();

		await deleteSubmission(submissionId);
	});

	test("should not show track dropdown for FULL_PAPER submission", async ({
		page,
		testRun,
	}) => {
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "FULL_PAPER",
			title: "Full Paper Research",
			content: "Content about full paper",
		});

		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(
			page.getByText(`${testRun.testRunId}_Full Paper Research`),
		).toBeVisible();

		await expect(page.getByText("Track", { exact: true })).not.toBeVisible();

		await deleteSubmission(submissionId);
	});

	test("should assign track to submission", async ({ page, testRun }) => {
		const trackId = await createTrack(testRun.testRunId, "NLP Research");
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "NLP Paper",
			content: "Content about natural language processing",
		});

		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Track", { exact: true })).toBeVisible();
		await page.getByRole("combobox").click();
		await page
			.getByRole("option", { name: `${testRun.testRunId}_NLP Research` })
			.click();

		await expect(page.getByText("Track updated")).toBeVisible();

		await deleteSubmission(submissionId);
		await deleteTrack(trackId);
	});

	test("should change assigned track", async ({ page, testRun }) => {
		const track1Id = await createTrack(testRun.testRunId, "AI Track");
		const track2Id = await createTrack(testRun.testRunId, "ML Track");
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "AI/ML Paper",
			content: "Content about AI and ML",
			trackId: track1Id,
		});

		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Track", { exact: true })).toBeVisible();
		await page.getByRole("combobox").click();
		await page
			.getByRole("option", { name: `${testRun.testRunId}_ML Track` })
			.click();

		await expect(page.getByText("Track updated")).toBeVisible();

		await deleteSubmission(submissionId);
		await deleteTrack(track1Id);
		await deleteTrack(track2Id);
	});

	test("should clear track assignment", async ({ page, testRun }) => {
		const trackId = await createTrack(
			testRun.testRunId,
			"Robotics Track",
		);
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "Robotics Paper",
			content: "Content about robotics",
			trackId,
		});

		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Track", { exact: true })).toBeVisible();
		await page.getByRole("combobox").click();
		await page.getByRole("option", { name: "None" }).click();

		await expect(page.getByText("Track updated")).toBeVisible();

		await deleteSubmission(submissionId);
		await deleteTrack(trackId);
	});

	test("should load only active tracks in dropdown", async ({
		page,
		testRun,
	}) => {
		const activeTrackId = await createTrack(
			testRun.testRunId,
			"Active",
			undefined,
			true,
		);
		const inactiveTrackId = await createTrack(
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

		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Track", { exact: true })).toBeVisible();
		await page.getByRole("combobox").click();

		await expect(
			page.getByRole("option", { name: `${testRun.testRunId}_Active` }),
		).toBeVisible();
		await expect(
			page.getByRole("option", { name: `${testRun.testRunId}_Inactive` }),
		).not.toBeVisible();

		await deleteSubmission(submissionId);
		await deleteTrack(activeTrackId);
		await deleteTrack(inactiveTrackId);
	});
});
