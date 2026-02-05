import { prisma } from "@/db";

export interface UserDashboardMetrics {
	mySubmissions: number;
	underReview: number;
	accepted: number;
	pendingReviews: number;
}

export async function getUserDashboardMetrics(
	userId: string,
): Promise<UserDashboardMetrics> {
	const [mySubmissions, underReview, accepted, pendingReviews] =
		await Promise.all([
			// Total submissions
			prisma.submission.count({
				where: { userId },
			}),
			// Under review
			prisma.submission.count({
				where: { userId, status: "UNDER_REVIEW" },
			}),
			// Accepted (including conditionally accepted)
			prisma.submission.count({
				where: {
					userId,
					status: { in: ["ACCEPTED", "CONDITIONALLY_ACCEPTED"] },
				},
			}),
			// Pending reviews
			prisma.reviewAssignment.count({
				where: { reviewerId: userId, status: "PENDING" },
			}),
		]);

	return {
		mySubmissions,
		underReview,
		accepted,
		pendingReviews,
	};
}
