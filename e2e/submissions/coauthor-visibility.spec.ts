import { test, expect } from "@playwright/test";
import {
	createSubmission,
	createTestUser,
	deleteSubmission,
	deleteTestUser,
	getTestUserIds,
} from "../helpers/test-db";
import { randomUUID } from "crypto";
import { DEFAULT_PASSWORD, TEST_USER } from "../helpers/test-users";
import { loginAs } from "../helpers/auth";

/**
 * Co-author visibility tests
 * Tests that co-authors can see submissions they're listed on (read-only)
 * Uses per-test user isolation — each test creates its own co-author user
 */

interface CoAuthorScenario {
	submission: { id: string; title: string };
	coauthor: { id: string; email: string };
	cleanup: () => Promise<void>;
}

async function arrangeCoAuthorScenario(title: string): Promise<CoAuthorScenario> {
	const testRunId = `e2e_${randomUUID().slice(0, 8)}`;
	const coauthorEmail = `coauthor-${testRunId}@e2e.local`;

	const coauthor = await createTestUser({
		email: coauthorEmail,
		password: DEFAULT_PASSWORD,
		firstName: "CoAuthor",
		lastName: "Test",
		emailVerified: true,
	});
	const { testUserId } = await getTestUserIds();

	const submission = await createSubmission({
		testRunId,
		title,
		userId: testUserId,
		extraAuthors: [
			{
				firstName: "CoAuthor",
				lastName: "Test",
				email: coauthorEmail,
				userId: coauthor.id,
			},
		],
	});

	return {
		submission,
		coauthor: { id: coauthor.id, email: coauthorEmail },
		cleanup: async () => {
			await deleteSubmission(submission.id).catch(() => {});
			await deleteTestUser(coauthor.id).catch(() => {});
		},
	};
}

test.describe("Co-author Visibility", () => {
	test("co-author sees submission in list with badge", async ({ page }) => {
		test.slow(); // createTestUser involves dynamic auth import
		// Arrange
		const { submission, coauthor, cleanup } = await arrangeCoAuthorScenario("CoAuthor List Test");

		try {
			// Act
			await loginAs(page, { email: coauthor.email, password: DEFAULT_PASSWORD });
			await page.goto("/submissions");

			// Assert
			await expect(page.getByText(submission.title).first()).toBeVisible();
			await expect(page.getByText("Co-author").first()).toBeVisible();
		} finally {
			await cleanup();
		}
	});

	test("co-author detail is read-only — no Edit/Withdraw actions", async ({ page }) => {
		test.slow(); // createTestUser involves dynamic auth import
		// Arrange
		const { submission, coauthor, cleanup } = await arrangeCoAuthorScenario("CoAuthor ReadOnly Test");

		try {
			// Act
			await loginAs(page, { email: coauthor.email, password: DEFAULT_PASSWORD });
			await page.goto(`/submissions/${submission.id}`);

			// Assert — read-only badge visible
			await expect(page.getByText("Co-author (read-only)")).toBeVisible();

			// Assert — no action buttons (Edit, Withdraw)
			await expect(page.getByRole("button", { name: /Edit/i })).not.toBeVisible();
			await expect(page.getByRole("button", { name: /Withdraw/i })).not.toBeVisible();
		} finally {
			await cleanup();
		}
	});

	test("owner sees full actions — no read-only badge", async ({ page }) => {
		test.slow(); // createTestUser involves dynamic auth import
		// Arrange
		const { submission, cleanup } = await arrangeCoAuthorScenario("Owner Actions Test");

		try {
			// Act — login as owner (test@e2e.local)
			await loginAs(page, TEST_USER);
			await page.goto(`/submissions/${submission.id}`);

			// Assert — no read-only badge
			await expect(page.getByText("Co-author (read-only)")).not.toBeVisible();

			// Assert — submission title visible (owner has access)
			await expect(page.getByText(submission.title).first()).toBeVisible();
		} finally {
			await cleanup();
		}
	});

	test("unlinked co-author email — submission not visible", async ({ page }) => {
		test.slow(); // createTestUser involves dynamic auth import
		// Arrange — create submission with co-author email that doesn't match any user
		const testRunId = `e2e_${randomUUID().slice(0, 8)}`;
		const unlinkedEmail = `nobody-${testRunId}@e2e.local`;
		const otherEmail = `other-${testRunId}@e2e.local`;

		const otherUser = await createTestUser({
			email: otherEmail,
			password: DEFAULT_PASSWORD,
			firstName: "Other",
			lastName: "User",
			emailVerified: true,
		});
		const { testUserId } = await getTestUserIds();

		const submission = await createSubmission({
			testRunId,
			title: "Unlinked CoAuthor Test",
			userId: testUserId,
			extraAuthors: [
				{ firstName: "Nobody", lastName: "CoAuthor", email: unlinkedEmail },
			],
		});

		try {
			// Act — login as the other user (not listed as co-author)
			await loginAs(page, { email: otherEmail, password: DEFAULT_PASSWORD });
			await page.goto("/submissions");

			// Assert — submission not visible
			await expect(page.getByText(submission.title).first()).not.toBeVisible();
		} finally {
			await deleteSubmission(submission.id).catch(() => {});
			await deleteTestUser(otherUser.id).catch(() => {});
		}
	});
});
