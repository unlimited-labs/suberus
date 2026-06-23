import { prisma } from "@/shared/server/db.server";

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
			prisma.submission.count({
				where: { userId },
			}),
			prisma.submission.count({
				where: { userId, status: "UNDER_REVIEW" },
			}),
			prisma.submission.count({
				where: {
					userId,
					status: { in: ["ACCEPTED", "CONDITIONALLY_ACCEPTED"] },
				},
			}),
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
