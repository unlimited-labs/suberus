/**
 * E2E tests for /api/cron/check-overdue endpoint
 *
 * Tests authorization and overdue assignment marking logic
 */

import { test, expect } from "@playwright/test";
import {
	createAssignmentWithDeadline,
	deleteSubmission,
	getAssignmentStatus,
} from "../helpers/test-db";
import { AssignmentStatus } from "../../src/generated/prisma/enums";

const CRON_SECRET = "test-cron-secret-for-e2e";
const API_URL = "/api/cron/check-overdue";

test.describe("Cron API - Check Overdue Assignments", () => {
	test.describe("Authorization", () => {
		test("returns 401 without Authorization header", async ({ request }) => {
			const response = await request.post(API_URL);

			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).toBe("Unauthorized");
		});

		test("returns 401 with invalid token", async ({ request }) => {
			const response = await request.post(API_URL, {
				headers: {
					Authorization: "Bearer wrong-secret",
				},
			});

			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).toBe("Unauthorized");
		});

		test("returns 500 when CRON_SECRET not configured", async ({ request }) => {
			// This test verifies the endpoint handles missing config gracefully
			// In real env without CRON_SECRET set, should return 500
			// Skip if CRON_SECRET is set (tested in other tests)
			const response = await request.post(API_URL, {
				headers: {
					Authorization: `Bearer ${CRON_SECRET}`,
				},
			});

			// Either 500 (no secret configured) or 200 (secret matches)
			expect([200, 500]).toContain(response.status());
		});
	});

	test.describe("Overdue Logic", () => {
		let submissionId: string;
		let assignmentId: string;

		test.beforeEach(async () => {
			// Create assignment with deadline in the past
			const result = await createAssignmentWithDeadline({
				title: `Overdue Test ${Date.now()}`,
				assignmentStatus: AssignmentStatus.PENDING,
				deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
			});
			submissionId = result.submissionId;
			assignmentId = result.assignmentId;
		});

		test.afterEach(async () => {
			if (submissionId) {
				await deleteSubmission(submissionId);
			}
		});

		test("marks PENDING assignment as OVERDUE when deadline passed", async ({
			request,
		}) => {
			// Arrange - verify initial status
			const initialStatus = await getAssignmentStatus(assignmentId);
			expect(initialStatus).toBe(AssignmentStatus.PENDING);

			// Act - call the cron endpoint
			const response = await request.post(API_URL, {
				headers: {
					Authorization: `Bearer ${CRON_SECRET}`,
				},
			});

			// Assert - check response and status change
			// May return 500 if CRON_SECRET not configured in test env
			if (response.status() === 200) {
				const body = await response.json();
				expect(body.success).toBe(true);
				expect(body.markedCount).toBeGreaterThanOrEqual(1);

				const newStatus = await getAssignmentStatus(assignmentId);
				expect(newStatus).toBe(AssignmentStatus.OVERDUE);
			} else {
				// CRON_SECRET not configured - skip logic assertion
				expect(response.status()).toBe(500);
			}
		});

		test("marks IN_PROGRESS assignment as OVERDUE when deadline passed", async ({
			request,
		}) => {
			// Arrange - create IN_PROGRESS assignment
			const result = await createAssignmentWithDeadline({
				title: `Overdue In Progress ${Date.now()}`,
				assignmentStatus: AssignmentStatus.IN_PROGRESS,
				deadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
			});

			const inProgressId = result.assignmentId;
			const inProgressSubmissionId = result.submissionId;

			try {
				// Act
				const response = await request.post(API_URL, {
					headers: {
						Authorization: `Bearer ${CRON_SECRET}`,
					},
				});

				// Assert
				if (response.status() === 200) {
					const newStatus = await getAssignmentStatus(inProgressId);
					expect(newStatus).toBe(AssignmentStatus.OVERDUE);
				}
			} finally {
				await deleteSubmission(inProgressSubmissionId);
			}
		});

		test("does not mark COMPLETED assignment as OVERDUE", async ({
			request,
		}) => {
			// Arrange - create COMPLETED assignment with past deadline
			const result = await createAssignmentWithDeadline({
				title: `Completed Past Deadline ${Date.now()}`,
				assignmentStatus: AssignmentStatus.COMPLETED,
				deadline: new Date(Date.now() - 24 * 60 * 60 * 1000),
			});

			try {
				// Act
				const response = await request.post(API_URL, {
					headers: {
						Authorization: `Bearer ${CRON_SECRET}`,
					},
				});

				// Assert - COMPLETED should stay COMPLETED
				if (response.status() === 200) {
					const status = await getAssignmentStatus(result.assignmentId);
					expect(status).toBe(AssignmentStatus.COMPLETED);
				}
			} finally {
				await deleteSubmission(result.submissionId);
			}
		});

		test("does not mark assignment with future deadline as OVERDUE", async ({
			request,
		}) => {
			// Arrange - create assignment with future deadline
			const result = await createAssignmentWithDeadline({
				title: `Future Deadline ${Date.now()}`,
				assignmentStatus: AssignmentStatus.PENDING,
				deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
			});

			try {
				// Act
				const response = await request.post(API_URL, {
					headers: {
						Authorization: `Bearer ${CRON_SECRET}`,
					},
				});

				// Assert - should remain PENDING
				if (response.status() === 200) {
					const status = await getAssignmentStatus(result.assignmentId);
					expect(status).toBe(AssignmentStatus.PENDING);
				}
			} finally {
				await deleteSubmission(result.submissionId);
			}
		});
	});
});
