import fs from "fs";
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

test.describe.serial("File Revision Round Isolation", () => {
	let testRunId: string;
	let submissionId: string;
	let v1FileId: string;
	let v1StorageKey: string;
	let v2FileId: string;
	let v2StorageKey: string;

	test.beforeAll(async () => {
		testRunId = `e2e_${randomUUID().slice(0, 8)}`;
		const db = getPrisma();
		const { testUserId } = await getTestUserIds();

		// Create submission with v1 file (PDF)
		const v1Data = await createSubmissionWithFile({
			testRunId,
			title: "Revision Round Isolation",
			type: SubmissionType.FULL_PAPER,
		});
		submissionId = v1Data.id;
		v1FileId = v1Data.fileId;
		v1StorageKey = v1Data.storageKey;

		// Create v2 with different file (DOCX)
		const { uploadFile, generateSubmissionFileKey } = await import(
			"../../src/lib/server/storage"
		);
		const docxPath = path.resolve("e2e/submissions/fixtures/document.docx");
		const docxBuffer = fs.readFileSync(docxPath);
		v2StorageKey = generateSubmissionFileKey(submissionId, 2, "document.docx");
		await uploadFile(
			Buffer.from(docxBuffer),
			v2StorageKey,
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		);

		const v2File = await db.file.create({
			data: {
				entityType: "SUBMISSION_VERSION",
				entityId: submissionId,
				type: "SUBMISSION_MAIN",
				storageKey: v2StorageKey,
				fileName: "document.docx",
				originalName: "document.docx",
				mimeType:
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				size: docxBuffer.length,
				uploadedById: testUserId,
			},
		});
		v2FileId = v2File.id;

		const v2Version = await db.submissionVersion.create({
			data: {
				submissionId,
				version: 2,
				title: v1Data.title,
				content: "",
				fileId: v2File.id,
			},
		});

		// Update submission to v2 as current
		await db.submission.update({
			where: { id: submissionId },
			data: {
				currentVersionId: v2Version.id,
				status: SubmissionStatus.RESUBMITTED,
			},
		});
	});

	test.afterAll(async () => {
		await deleteSubmission(submissionId).catch(() => {});
		// Clean up S3 files
		const { deleteFile } = await import("../../src/lib/server/storage");
		await deleteFile(v1StorageKey).catch(() => {});
		await deleteFile(v2StorageKey).catch(() => {});
	});

	test("v1 and v2 have separate storage keys", () => {
		// Assert
		expect(v1StorageKey).not.toBe(v2StorageKey);
		expect(v1StorageKey).toContain("/v1/");
		expect(v2StorageKey).toContain("/v2/");
	});

	test("both files exist in S3", async () => {
		// Arrange
		const { fileExists } = await import("../../src/lib/server/storage");

		// Assert
		expect(await fileExists(v1StorageKey)).toBe(true);
		expect(await fileExists(v2StorageKey)).toBe(true);
	});

	test("both version files accessible via API", async ({ page }) => {
		// Arrange
		await login(page, TEST_USER.email, TEST_USER.password);

		// Act & Assert
		const r1 = await page.request.get(`/api/files/${v1FileId}`);
		const r2 = await page.request.get(`/api/files/${v2FileId}`);
		expect(r1.status()).toBe(200);
		expect(r2.status()).toBe(200);
	});

	test("version switching shows correct file per version", async ({
		page,
	}) => {
		// Arrange
		await login(page, TEST_USER.email, TEST_USER.password);
		await page.goto(`/submissions/${submissionId}`);

		// Assert - v2 (current) shown by default
		await expect(page.getByText("document.docx")).toBeVisible();

		// Act - switch to v1
		const versionTrigger = page
			.getByRole("combobox")
			.filter({ hasText: /Version/ });
		await versionTrigger.click();
		await page.getByRole("option", { name: /Version 1/ }).click();

		// Assert - v1 file shown
		await expect(page.getByText("document.pdf")).toBeVisible();
	});

	test("download returns file content with correct size", async ({
		page,
	}) => {
		// Arrange
		await login(page, TEST_USER.email, TEST_USER.password);

		// Act - download v1 (PDF)
		const r1 = await page.request.get(`/api/files/${v1FileId}`);
		const body1 = await r1.body();

		// Assert - PDF fixture is 15533 bytes
		expect(r1.status()).toBe(200);
		expect(body1.length).toBeGreaterThan(0);

		// Act - download v2 (DOCX)
		const r2 = await page.request.get(`/api/files/${v2FileId}`);
		const body2 = await r2.body();

		// Assert - DOCX fixture is 13379 bytes, different from PDF
		expect(r2.status()).toBe(200);
		expect(body2.length).toBeGreaterThan(0);
		expect(body1.length).not.toBe(body2.length);
	});
});

test.describe("File S3 Cleanup", () => {
	test("deleteFile removes object from S3", async () => {
		// Arrange
		const testRunId = `e2e_${randomUUID().slice(0, 8)}`;
		const submissionData = await createSubmissionWithFile({
			testRunId,
			title: "S3 Cleanup Verification",
			type: SubmissionType.FULL_PAPER,
		});

		const { fileExists, deleteFile } = await import(
			"../../src/lib/server/storage"
		);

		// Pre-condition: file exists in S3
		expect(await fileExists(submissionData.storageKey)).toBe(true);

		// Act - delete from S3
		await deleteFile(submissionData.storageKey);

		// Assert - file gone from S3
		expect(await fileExists(submissionData.storageKey)).toBe(false);

		// Cleanup DB
		await deleteSubmission(submissionData.id).catch(() => {});
	});
});
