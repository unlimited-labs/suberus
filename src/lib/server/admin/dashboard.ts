import { prisma } from "@/db.server";
import type {
	AssignmentStatus,
	SubmissionStatus,
	SubmissionType,
	UserRole,
} from "@/generated/prisma/enums";
import { checkSmtpHealth, type SmtpHealthResult } from "@/lib/server/email";
import { getSetting } from "@/lib/server/settings";
import { checkS3Health, type S3HealthResult } from "@/lib/server/storage";
import type { AppSettingsMap } from "@/lib/settings/types";

export interface AdminDashboardMetrics {
	users: {
		total: number;
		byRole: Record<UserRole, number>;
		verified: number;
		unverified: number;
		recentSignups: number;
	};
	submissions: {
		total: number;
		byStatus: Record<SubmissionStatus, number>;
		byType: Record<SubmissionType, number>;
		recentCount: number;
	};
	reviews: {
		totalAssignments: number;
		byStatus: Record<AssignmentStatus, number>;
		completionRate: number;
	};
	fees: {
		totalCollected: number;
		paidCount: number;
		unpaidCount: number;
	};
	health: {
		overdueReviews: number;
		pendingDecisions: number;
		unverifiedUsers: number;
	};
	recentActivity: Array<{
		id: string;
		type: string;
		userId: string | null;
		submissionId: string | null;
		performerName: string | null;
		submissionTitle: string | null;
		userName: string | null;
		detail: Record<string, string | number | boolean | null> | null;
		createdAt: Date;
	}>;
	usersByCountry: Array<{ country: string; count: number }>;
	trends: {
		users: number[];
		submissions: number[];
		reviewsCompleted: number[];
		feesCollected: number[];
	};
	s3: S3HealthResult;
	smtp: SmtpHealthResult;
	llm: AppSettingsMap["SERVICE_HEALTH_LLM"];
	docling: AppSettingsMap["SERVICE_HEALTH_DOCLING"];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const TREND_DAYS = 14;

function dayIndex(date: Date, windowStart: Date): number {
	// Normalize to local midnight and round so DST (23h/25h days) doesn't shift buckets.
	const dayStart = new Date(date);
	dayStart.setHours(0, 0, 0, 0);
	const idx = Math.round((dayStart.getTime() - windowStart.getTime()) / DAY_MS);
	return Math.min(Math.max(idx, 0), TREND_DAYS - 1);
}

function bucketCounts(dates: Date[], windowStart: Date): number[] {
	const buckets = new Array<number>(TREND_DAYS).fill(0);
	for (const date of dates) {
		buckets[dayIndex(date, windowStart)] += 1;
	}
	return buckets;
}

function bucketSums(
	rows: Array<{ date: Date; amount: number }>,
	windowStart: Date,
): number[] {
	const buckets = new Array<number>(TREND_DAYS).fill(0);
	for (const row of rows) {
		buckets[dayIndex(row.date, windowStart)] += row.amount;
	}
	return buckets;
}

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const trendWindowStart = new Date();
	trendWindowStart.setHours(0, 0, 0, 0);
	trendWindowStart.setDate(trendWindowStart.getDate() - (TREND_DAYS - 1));

	const [s3Health, smtpHealth, llmHealth, doclingHealth] = await Promise.all([
		checkS3Health(),
		checkSmtpHealth(),
		getSetting("SERVICE_HEALTH_LLM"),
		getSetting("SERVICE_HEALTH_DOCLING"),
	]);

	const [
		usersGroupedByRole,
		totalUsers,
		verifiedUsers,
		recentSignups,
		submissionsGroupedByStatus,
		submissionsGroupedByType,
		totalSubmissions,
		recentSubmissions,
		reviewAssignmentsGroupedByStatus,
		totalAssignments,
		completedAssignments,
		paidFees,
		unpaidFees,
		overdueReviews,
		pendingDecisions,
		unverifiedUsers,
		recentActivity,
		usersByCountry,
		trendUsers,
		trendSubmissions,
		trendReviewsCompleted,
		trendFees,
	] = await Promise.all([
		// Users by role
		prisma.user.groupBy({
			by: ["role"],
			_count: true,
		}),
		// Total users
		prisma.user.count(),
		// Verified users
		prisma.user.count({ where: { emailVerified: true } }),
		// Recent signups (last 7 days)
		prisma.user.count({
			where: { createdAt: { gte: sevenDaysAgo } },
		}),
		// Submissions by status
		prisma.submission.groupBy({
			by: ["status"],
			_count: true,
		}),
		// Submissions by type
		prisma.submission.groupBy({
			by: ["type"],
			_count: true,
		}),
		// Total submissions
		prisma.submission.count(),
		// Recent submissions
		prisma.submission.count({
			where: { createdAt: { gte: sevenDaysAgo } },
		}),
		// Review assignments by status
		prisma.reviewAssignment.groupBy({
			by: ["status"],
			_count: true,
		}),
		// Total assignments
		prisma.reviewAssignment.count(),
		// Completed assignments
		prisma.reviewAssignment.count({ where: { status: "COMPLETED" } }),
		// Paid fees
		prisma.fee.findMany({
			where: { paid: true },
			select: { amount: true },
		}),
		// Unpaid fees count
		prisma.fee.count({ where: { paid: false } }),
		// Overdue reviews
		prisma.reviewAssignment.count({ where: { status: "OVERDUE" } }),
		// Pending decisions
		prisma.submission.count({ where: { status: "AWAITING_DECISION" } }),
		// Unverified users
		prisma.user.count({ where: { emailVerified: false } }),
		// Recent activity
		prisma.activityLog.findMany({
			take: 20,
			orderBy: { createdAt: "desc" },
			include: {
				submission: { select: { id: true, title: true } },
				user: { select: { id: true, firstName: true, lastName: true } },
				performer: { select: { id: true, firstName: true, lastName: true } },
			},
		}),
		// Users by country
		prisma.user.groupBy({
			by: ["country"],
			_count: true,
			where: { country: { not: null } },
		}),
		// Trend: new signups per day (last 14 days)
		prisma.user.findMany({
			where: { createdAt: { gte: trendWindowStart } },
			select: { createdAt: true },
		}),
		// Trend: new submissions per day (last 14 days)
		prisma.submission.findMany({
			where: { createdAt: { gte: trendWindowStart } },
			select: { createdAt: true },
		}),
		// Trend: completed reviews per day (last 14 days)
		prisma.reviewAssignment.findMany({
			where: { completedAt: { gte: trendWindowStart } },
			select: { completedAt: true },
		}),
		// Trend: fees collected per day (last 14 days)
		prisma.fee.findMany({
			where: { paid: true, paidAt: { gte: trendWindowStart } },
			select: { paidAt: true, amount: true },
		}),
	]);

	// Transform users by role
	const byRole: Record<UserRole, number> = {
		AUTHOR: 0,
		REVIEWER: 0,
		EDITOR: 0,
		ADMIN: 0,
	};
	for (const group of usersGroupedByRole) {
		byRole[group.role] = group._count;
	}

	// Transform submissions by status
	const byStatus: Record<SubmissionStatus, number> = {
		DRAFT: 0,
		SUBMITTED: 0,
		UNDER_REVIEW: 0,
		REVIEWS_COMPLETE: 0,
		AWAITING_DECISION: 0,
		REVISE_REQUIRED: 0,
		RESUBMITTED: 0,
		ACCEPTED: 0,
		CONDITIONALLY_ACCEPTED: 0,
		REJECTED: 0,
		WITHDRAWN: 0,
	};
	for (const group of submissionsGroupedByStatus) {
		byStatus[group.status] = group._count;
	}

	// Transform submissions by type
	const byType: Record<SubmissionType, number> = {
		ABSTRACT: 0,
		FULL_PAPER: 0,
		POSTER: 0,
	};
	for (const group of submissionsGroupedByType) {
		byType[group.type] = group._count;
	}

	// Transform review assignments by status
	const byAssignmentStatus: Record<AssignmentStatus, number> = {
		PENDING: 0,
		COMPLETED: 0,
		CANCELLED: 0,
		OVERDUE: 0,
	};
	for (const group of reviewAssignmentsGroupedByStatus) {
		byAssignmentStatus[group.status] = group._count;
	}

	// Calculate completion rate
	const completionRate =
		totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

	// Calculate total fees collected (convert Decimal to number)
	const totalCollected = paidFees.reduce((sum, fee) => {
		return sum + (fee.amount ? Number(fee.amount) : 0);
	}, 0);

	// Build daily trend series (last 14 days, oldest -> newest)
	const trends = {
		users: bucketCounts(
			trendUsers.map((u) => u.createdAt),
			trendWindowStart,
		),
		submissions: bucketCounts(
			trendSubmissions.map((s) => s.createdAt),
			trendWindowStart,
		),
		reviewsCompleted: bucketCounts(
			trendReviewsCompleted
				.map((r) => r.completedAt)
				.filter((d): d is Date => d !== null),
			trendWindowStart,
		),
		feesCollected: bucketSums(
			trendFees
				.filter((f): f is typeof f & { paidAt: Date } => f.paidAt !== null)
				.map((f) => ({
					date: f.paidAt,
					amount: f.amount ? Number(f.amount) : 0,
				})),
			trendWindowStart,
		),
	};

	return {
		users: {
			total: totalUsers,
			byRole,
			verified: verifiedUsers,
			unverified: totalUsers - verifiedUsers,
			recentSignups,
		},
		submissions: {
			total: totalSubmissions,
			byStatus,
			byType,
			recentCount: recentSubmissions,
		},
		reviews: {
			totalAssignments,
			byStatus: byAssignmentStatus,
			completionRate,
		},
		fees: {
			totalCollected,
			paidCount: paidFees.length,
			unpaidCount: unpaidFees,
		},
		health: {
			overdueReviews,
			pendingDecisions,
			unverifiedUsers,
		},
		recentActivity: recentActivity.map((item) => ({
			id: item.id,
			type: item.type,
			userId: item.userId,
			submissionId: item.submissionId,
			performerName: item.performer
				? `${item.performer.firstName ?? ""} ${item.performer.lastName ?? ""}`.trim() ||
					null
				: null,
			submissionTitle: item.submission?.title ?? null,
			userName: item.user
				? `${item.user.firstName ?? ""} ${item.user.lastName ?? ""}`.trim() ||
					null
				: null,
			detail: item.detail as Record<
				string,
				string | number | boolean | null
			> | null,
			createdAt: item.createdAt,
		})),
		usersByCountry: usersByCountry
			.filter((g): g is typeof g & { country: string } => g.country !== null)
			.map((g) => ({ country: g.country, count: g._count })),
		trends,
		s3: s3Health,
		smtp: smtpHealth,
		llm: llmHealth,
		docling: doclingHealth,
	};
}
