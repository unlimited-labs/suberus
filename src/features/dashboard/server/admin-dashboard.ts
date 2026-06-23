import { startOfDay, subDays } from "date-fns";
import { getSetting } from "@/features/settings/server/settings";
import type { AppSettingsMap } from "@/features/settings/types";
import type {
	AssignmentStatus,
	SubmissionStatus,
	SubmissionType,
	UserRole,
} from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";
import { checkSmtpHealth, type SmtpHealthResult } from "@/shared/server/email";
import { checkS3Health, type S3HealthResult } from "@/shared/server/storage";
import {
	bucketCounts,
	bucketSums,
	completionRate,
	formatPersonName,
	sumFeeAmounts,
	TREND_DAYS,
	tallyGroups,
} from "./admin-dashboard-transforms";

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
		currency: AppSettingsMap["FEE_CURRENCY"];
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
	// System-health fields are stripped for non-admins (see getAdminDashboard).
	s3?: S3HealthResult;
	smtp?: SmtpHealthResult;
	llm?: AppSettingsMap["SERVICE_HEALTH_LLM"];
	docling?: AppSettingsMap["SERVICE_HEALTH_DOCLING"];
}

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
	const sevenDaysAgo = subDays(new Date(), 7);
	const trendWindowStart = subDays(startOfDay(new Date()), TREND_DAYS - 1);

	const [s3Health, smtpHealth, llmHealth, doclingHealth, feeCurrency] =
		await Promise.all([
			checkS3Health(),
			checkSmtpHealth(),
			getSetting("SERVICE_HEALTH_LLM"),
			getSetting("SERVICE_HEALTH_DOCLING"),
			getSetting("FEE_CURRENCY"),
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
		unpaidSubmitters,
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
		// Unpaid submitters (users with >=1 submission and no paid fee)
		prisma.user.count({
			where: {
				submissions: { some: {} },
				OR: [{ fee: null }, { fee: { paid: false } }],
			},
		}),
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

	const byRole = tallyGroups<(typeof usersGroupedByRole)[number], UserRole>(
		{ AUTHOR: 0, REVIEWER: 0, EDITOR: 0, ADMIN: 0, EXHIBITOR: 0 },
		usersGroupedByRole,
		(g) => g.role,
	);

	const byStatus = tallyGroups<
		(typeof submissionsGroupedByStatus)[number],
		SubmissionStatus
	>(
		{
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
		},
		submissionsGroupedByStatus,
		(g) => g.status,
	);

	const byType = tallyGroups<
		(typeof submissionsGroupedByType)[number],
		SubmissionType
	>(
		{ ABSTRACT: 0, FULL_PAPER: 0, POSTER: 0, EXHIBITOR: 0 },
		submissionsGroupedByType,
		(g) => g.type,
	);

	const byAssignmentStatus = tallyGroups<
		(typeof reviewAssignmentsGroupedByStatus)[number],
		AssignmentStatus
	>(
		{ PENDING: 0, COMPLETED: 0, CANCELLED: 0, OVERDUE: 0 },
		reviewAssignmentsGroupedByStatus,
		(g) => g.status,
	);

	const totalCollected = sumFeeAmounts(paidFees);

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
			completionRate: completionRate(completedAssignments, totalAssignments),
		},
		fees: {
			totalCollected,
			paidCount: paidFees.length,
			unpaidCount: unpaidSubmitters,
			currency: feeCurrency,
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
			performerName: formatPersonName(item.performer),
			submissionTitle: item.submission?.title ?? null,
			userName: formatPersonName(item.user),
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
