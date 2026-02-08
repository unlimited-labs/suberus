import path from "path";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "crypto";
import {
	createSubmission,
	createSubmissionWithFile,
	createTestUser,
	deleteSubmission,
	deleteTestUser,
	getTestUserIds,
	getPrisma,
} from "../helpers/test-db";
import { SubmissionStatus, SubmissionType } from "../../src/generated/prisma/enums";

const TEST_USER = {
	email: "test@e2e.local",
	password: "testpass123",
};

const ADMIN_USER = {
	email: "admin@e2e.local",
	password: "testpass123",
};

const REVIEWER_USER = {
	email: "reviewer@e2e.local",
	password: "testpass123",
};

const EDITOR_USER = {
	email: "editor@e2e.local",
	password: "testpass123",
};

async function login(page: Page, email: string, password: string) {
	await page.goto("/login");
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 });
	await page.getByLabel("E-mail").fill(email);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Sign in" }).click();
	await page.waitForURL("/", { timeout: 30000 });
}

test.describe.serial("File Access Control", () => {
	let testRunId: string;
	let submissionData: Awaited<ReturnType<typeof createSubmissionWithFile>>;

	test.beforeAll(async () => {
		testRunId = `e2e_${randomUUID().slice(0, 8)}`;
		submissionData = await createSubmissionWithFile({
			testRunId,
			title: "File Access Test Paper",
			type: SubmissionType.FULL_PAPER,
		});
	});

	test.afterAll(async () => {
		await deleteSubmission(submissionData.id).catch(() => {});
	});

	test("author can see and download file", async ({ page }) => {
		// Arrange
		await login(page, TEST_USER.email, TEST_USER.password);

		// Act
		await page.goto(`/submissions/${submissionData.id}`);

		// Assert
		await expect(page.getByText("document.pdf")).toBeVisible();
		await expect(page.getByTestId("file-download-button")).toBeVisible();
	});

	test("editor can download any file", async ({ page }) => {
		// Arrange
		await login(page, EDITOR_USER.email, EDITOR_USER.password);

		// Act - access via API
		const response = await page.request.get(
			`/api/files/${submissionData.fileId}`,
		);

		// Assert - 302 redirect to S3 pre-signed URL
		expect(response.status()).toBe(200); // Playwright follows redirects
	});

	test("admin can download any file", async ({ page }) => {
		// Arrange
		await login(page, ADMIN_USER.email, ADMIN_USER.password);

		// Act
		const response = await page.request.get(
			`/api/files/${submissionData.fileId}`,
		);

		// Assert
		expect(response.status()).toBe(200);
	});

	test("unauthenticated user gets 401", async ({ page }) => {
		// Act - make request without auth
		const response = await page.request.get(
			`/api/files/${submissionData.fileId}`,
			{ maxRedirects: 0 },
		);

		// Assert
		expect(response.status()).toBe(401);
	});

	test("other user cannot download via direct link", async ({ page }) => {
		// Arrange - create ephemeral user
		const otherEmail = `other-${testRunId}@e2e.local`;
		const otherUser = await createTestUser({
			email: otherEmail,
			password: "testpass123",
			firstName: "Other",
			lastName: "User",
			emailVerified: true,
		});

		try {
			await login(page, otherEmail, "testpass123");

			// Act
			const response = await page.request.get(
				`/api/files/${submissionData.fileId}`,
				{ maxRedirects: 0 },
			);

			// Assert
			expect(response.status()).toBe(403);
		} finally {
			await deleteTestUser(otherUser.id).catch(() => {});
		}
	});
});

test.describe.serial("File Access - Reviewer", () => {
	let testRunId: string;
	let submissionData: Awaited<ReturnType<typeof createSubmissionWithFile>>;

	test.beforeAll(async () => {
		testRunId = `e2e_${randomUUID().slice(0, 8)}`;
		const { reviewerUserId, adminUserId } = await getTestUserIds();
		const db = getPrisma();

		// Create submission with file
		submissionData = await createSubmissionWithFile({
			testRunId,
			title: "Reviewer File Access Test",
			type: SubmissionType.FULL_PAPER,
			status: SubmissionStatus.UNDER_REVIEW,
		});

		// Create assignment for reviewer
		await db.reviewAssignment.create({
			data: {
				submissionId: submissionData.id,
				reviewerId: reviewerUserId,
				round: 1,
				status: "PENDING",
				deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
				assignedBy: adminUserId,
				orderIndex: 0,
			},
		});
	});

	test.afterAll(async () => {
		await deleteSubmission(submissionData.id).catch(() => {});
	});

	test("assigned reviewer can access file", async ({ page }) => {
		// Arrange
		await login(page, REVIEWER_USER.email, REVIEWER_USER.password);

		// Act
		const response = await page.request.get(
			`/api/files/${submissionData.fileId}`,
		);

		// Assert
		expect(response.status()).toBe(200);
	});
});

test.describe.serial("File Access - Unassigned Reviewer", () => {
	let testRunId: string;
	let submissionData: Awaited<ReturnType<typeof createSubmissionWithFile>>;

	test.beforeAll(async () => {
		testRunId = `e2e_${randomUUID().slice(0, 8)}`;
		// Create submission with file but NO assignment for reviewer
		submissionData = await createSubmissionWithFile({
			testRunId,
			title: "Unassigned Reviewer File Test",
			type: SubmissionType.FULL_PAPER,
		});
	});

	test.afterAll(async () => {
		await deleteSubmission(submissionData.id).catch(() => {});
	});

	test("unassigned reviewer cannot access file", async ({ page }) => {
		// Arrange
		await login(page, REVIEWER_USER.email, REVIEWER_USER.password);

		// Act
		const response = await page.request.get(
			`/api/files/${submissionData.fileId}`,
			{ maxRedirects: 0 },
		);

		// Assert
		expect(response.status()).toBe(403);
	});
});

test.describe.serial("File Access - Co-author", () => {
	let testRunId: string;
	let submissionData: Awaited<ReturnType<typeof createSubmissionWithFile>>;
	test.beforeAll(async () => {
		testRunId = `e2e_${randomUUID().slice(0, 8)}`;
		const { editorUserId } = await getTestUserIds();

		// Create submission with editor as co-author
		submissionData = await createSubmissionWithFile({
			testRunId,
			title: "CoAuthor File Access Test",
			type: SubmissionType.FULL_PAPER,
			extraAuthors: [
				{
					firstName: "Editor",
					lastName: "User",
					email: EDITOR_USER.email,
					userId: editorUserId,
				},
			],
		});
	});

	test.afterAll(async () => {
		await deleteSubmission(submissionData.id).catch(() => {});
	});

	test("co-author can download file", async ({ page }) => {
		// Arrange
		await login(page, EDITOR_USER.email, EDITOR_USER.password);

		// Act
		const response = await page.request.get(
			`/api/files/${submissionData.fileId}`,
		);

		// Assert
		expect(response.status()).toBe(200);
	});
});

test.describe("File Access - Isolation & Cleanup", () => {
	test("text submission shows no file section", async ({ page }) => {
		// Arrange
		const testRunId = `e2e_${randomUUID().slice(0, 8)}`;
		const submission = await createSubmission({
			testRunId,
			title: "Text Only Submission",
			type: SubmissionType.ABSTRACT,
		});

		try {
			await login(page, TEST_USER.email, TEST_USER.password);
			await page.goto(`/submissions/${submission.id}`);

			// Assert - no download button
			await expect(page.getByTestId("file-download-button")).not.toBeVisible();
		} finally {
			await deleteSubmission(submission.id).catch(() => {});
		}
	});

	test("file cleanup on submission deletion", async () => {
		// Arrange
		const testRunId = `e2e_${randomUUID().slice(0, 8)}`;
		const db = getPrisma();

		const submissionData = await createSubmissionWithFile({
			testRunId,
			title: "Cleanup Test Paper",
			type: SubmissionType.FULL_PAPER,
		});

		// Verify file exists
		const fileBefore = await db.file.findUnique({
			where: { id: submissionData.fileId },
		});
		expect(fileBefore).not.toBeNull();

		// Act
		await deleteSubmission(submissionData.id);

		// Assert - file record gone
		const fileAfter = await db.file.findUnique({
			where: { id: submissionData.fileId },
		});
		expect(fileAfter).toBeNull();
	});

	test("files from different authors are isolated", async ({ page }) => {
		// Arrange
		const testRunId = `e2e_${randomUUID().slice(0, 8)}`;
		const { testUserId, adminUserId } = await getTestUserIds();

		const file1 = await createSubmissionWithFile({
			testRunId,
			title: "Author1 File Isolation",
			type: SubmissionType.FULL_PAPER,
			userId: testUserId,
		});

		const file2 = await createSubmissionWithFile({
			testRunId,
			title: "Author2 File Isolation",
			type: SubmissionType.FULL_PAPER,
			userId: adminUserId,
		});

		try {
			// Login as admin (can access all files)
			await login(page, ADMIN_USER.email, ADMIN_USER.password);

			// Act & Assert - both files accessible independently
			const response1 = await page.request.get(`/api/files/${file1.fileId}`);
			const response2 = await page.request.get(`/api/files/${file2.fileId}`);

			expect(response1.status()).toBe(200);
			expect(response2.status()).toBe(200);
		} finally {
			await deleteSubmission(file1.id).catch(() => {});
			await deleteSubmission(file2.id).catch(() => {});
		}
	});
});

test.describe("File Revision", () => {
	test("revision allows file update", async ({ page }) => {
		test.slow();
		// Arrange - create submission with file in REVISE_REQUIRED status
		const testRunId = `e2e_${randomUUID().slice(0, 8)}`;
		const submissionData = await createSubmissionWithFile({
			testRunId,
			title: "Revision File Update Test",
			type: SubmissionType.FULL_PAPER,
			status: SubmissionStatus.REVISE_REQUIRED,
		});

		try {
			await login(page, TEST_USER.email, TEST_USER.password);

			// Act - navigate to revision page
			await page.goto(`/submissions/${submissionData.id}/revise`);

			// Assert - current file info shown
			await expect(page.getByText("document.pdf")).toBeVisible();
			await expect(page.getByText("Current file")).toBeVisible();

			// Upload new file
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(
				path.resolve("e2e/submissions/fixtures/document.docx"),
			);
			await expect(page.getByText("document.docx")).toBeVisible();

			// Submit revision
			await page.getByRole("button", { name: "Submit Revision" }).click();

			// Assert - redirect to detail page
			await page.waitForURL(
				new RegExp(`/submissions/${submissionData.id}$`),
				{ timeout: 60000 },
			);
			await expect(
				page.getByText("Revision submitted successfully"),
			).toBeVisible();
		} finally {
			await deleteSubmission(submissionData.id).catch(() => {});
		}
	});
});
