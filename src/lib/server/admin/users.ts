import { compareDesc } from "date-fns";
import { prisma } from "@/db.server";
import type { Prisma } from "@/generated/prisma/client";
import type {
	SubmissionStatus,
	SubmissionType,
	UserRole,
} from "@/generated/prisma/enums";
import { activityDetail } from "@/lib/activity-log";
import { logActivity, logActivityTx } from "@/lib/server/activity-log";
import { upsertAffiliation } from "@/lib/server/affiliations";
import { linkCoAuthorsByEmail } from "@/lib/server/submissions";
import { logger } from "@/logger.ts";

export type SubmissionInvolvementRole = "author" | "coauthor";

export interface SubmissionRoleSummary {
	type: SubmissionType;
	role: SubmissionInvolvementRole;
	draft: boolean;
	count: number;
}

export interface AdminUserSubmission {
	id: string;
	sequentialNumber: number;
	title: string;
	type: SubmissionType;
	status: SubmissionStatus;
	role: SubmissionInvolvementRole;
	updatedAt: Date;
}

export interface AdminUser {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	title: string | null;
	affiliation: string | null;
	affiliationId: string | null;
	orcid: string | null;
	address: string | null;
	country: string | null;
	needInvoice: boolean;
	role: UserRole;
	isActive: boolean;
	allowLateSubmission: boolean;
	emailVerified: boolean;
	createdAt: Date;
	lastLoginAt: Date | null;
	fee: {
		id: string;
		userId: string;
		paid: boolean;
		type: string;
		amount: number | null;
		currency: string | null;
		paidAt: Date | null;
	} | null;
	submissionRoles: SubmissionRoleSummary[];
	surveyAnswers: { questionId: string; value: string }[];
}

/** User detail payload — adds the full submission list (owned + co-authored). */
export interface AdminUserDetail extends AdminUser {
	submissions: AdminUserSubmission[];
}

export interface UsersFilters {
	search?: string;
	role?: UserRole[];
	feePaid?: boolean;
}

export interface GetUsersResponse {
	users: AdminUser[];
	total: number;
}

/** Prisma include fragment that loads everything needed to derive submission roles. */
const submissionRolesInclude = {
	submissions: { select: { type: true, status: true } },
	submissionAuthors: {
		select: {
			submission: { select: { type: true, status: true, userId: true } },
		},
	},
	surveyAnswers: { select: { questionId: true, value: true } },
} satisfies Prisma.UserInclude;

type UserWithSubmissionRoles = Prisma.UserGetPayload<{
	include: typeof submissionRolesInclude;
}>;

/**
 * Aggregate a user's submission involvements into (type, role, draft) buckets.
 * Author = owns the submission; coauthor = listed as author on someone else's.
 */
function buildSubmissionRoles(
	user: UserWithSubmissionRoles,
): SubmissionRoleSummary[] {
	const buckets = new Map<string, SubmissionRoleSummary>();

	const add = (
		type: SubmissionType,
		role: SubmissionInvolvementRole,
		draft: boolean,
	) => {
		const key = `${type}|${role}|${draft}`;
		const existing = buckets.get(key);
		if (existing) {
			existing.count += 1;
		} else {
			buckets.set(key, { type, role, draft, count: 1 });
		}
	};

	for (const s of user.submissions) {
		add(s.type, "author", s.status === "DRAFT");
	}
	for (const sa of user.submissionAuthors) {
		if (sa.submission.userId === user.id) continue; // own submission → already counted as author
		add(sa.submission.type, "coauthor", sa.submission.status === "DRAFT");
	}

	return Array.from(buckets.values());
}

const submissionDetailSelect = {
	id: true,
	sequentialNumber: true,
	title: true,
	type: true,
	status: true,
	updatedAt: true,
} satisfies Prisma.SubmissionSelect;

/** Detail-page include: full submission rows for owned + co-authored work. */
const userDetailInclude = {
	fee: true,
	affiliation: true,
	surveyAnswers: { select: { questionId: true, value: true } },
	submissions: { select: submissionDetailSelect },
	submissionAuthors: {
		select: {
			submission: { select: { ...submissionDetailSelect, userId: true } },
		},
	},
} satisfies Prisma.UserInclude;

type UserWithDetail = Prisma.UserGetPayload<{
	include: typeof userDetailInclude;
}>;

/**
 * Build the user's submission list (owned as author, others' as coauthor),
 * deduped so a user who both owns and co-authors a submission shows once as author.
 */
function buildUserSubmissions(user: UserWithDetail): AdminUserSubmission[] {
	// Map keyed by submission id → at most one row per submission. Owned rows are
	// added first (role "author") and win over any co-author row for the same
	// submission, even if the user is listed multiple times as co-author.
	const byId = new Map<string, AdminUserSubmission>();

	for (const s of user.submissions) {
		byId.set(s.id, {
			id: s.id,
			sequentialNumber: s.sequentialNumber,
			title: s.title,
			type: s.type,
			status: s.status,
			role: "author",
			updatedAt: s.updatedAt,
		});
	}

	for (const sa of user.submissionAuthors) {
		const s = sa.submission;
		if (byId.has(s.id)) continue; // already counted (as author, or a duplicate co-author row)
		byId.set(s.id, {
			id: s.id,
			sequentialNumber: s.sequentialNumber,
			title: s.title,
			type: s.type,
			status: s.status,
			role: "coauthor",
			updatedAt: s.updatedAt,
		});
	}

	return Array.from(byId.values()).sort((a, b) =>
		compareDesc(a.updatedAt, b.updatedAt),
	);
}

export async function getUsers(data: UsersFilters): Promise<GetUsersResponse> {
	const where: Prisma.UserWhereInput = {};

	// Search filter
	if (data.search) {
		where.OR = [
			{ email: { contains: data.search, mode: "insensitive" } },
			{ firstName: { contains: data.search, mode: "insensitive" } },
			{ lastName: { contains: data.search, mode: "insensitive" } },
			{ affiliation: { name: { contains: data.search, mode: "insensitive" } } },
		];
	}

	// Role filter
	if (data.role && data.role.length > 0) {
		where.role = { in: data.role };
	}

	// Fee paid filter
	if (data.feePaid !== undefined) {
		if (data.feePaid) {
			where.fee = { paid: true };
		} else {
			where.OR = [...(where.OR ?? []), { fee: null }, { fee: { paid: false } }];
			// If we already have search OR, we need to use AND
			if (data.search) {
				where.AND = [
					{
						OR: [
							{ email: { contains: data.search, mode: "insensitive" } },
							{ firstName: { contains: data.search, mode: "insensitive" } },
							{ lastName: { contains: data.search, mode: "insensitive" } },
							{
								affiliation: {
									name: { contains: data.search, mode: "insensitive" },
								},
							},
						],
					},
					{
						OR: [{ fee: null }, { fee: { paid: false } }],
					},
				];
				delete where.OR;
			}
		}
	}

	const users = await prisma.user.findMany({
		where,
		include: {
			fee: true,
			affiliation: true,
			...submissionRolesInclude,
		},
		orderBy: { createdAt: "desc" },
	});

	const mapped: AdminUser[] = users.map((u) => ({
		id: u.id,
		email: u.email,
		firstName: u.firstName,
		lastName: u.lastName,
		title: u.title,
		affiliation: u.affiliation?.name ?? null,
		affiliationId: u.affiliationId,
		orcid: u.orcid,
		address: u.address,
		country: u.country,
		needInvoice: u.needInvoice,
		role: u.role,
		isActive: u.isActive,
		allowLateSubmission: u.allowLateSubmission,
		emailVerified: u.emailVerified,
		createdAt: u.createdAt,
		lastLoginAt: u.lastLoginAt,
		fee: u.fee
			? {
					id: u.fee.id,
					userId: u.fee.userId,
					paid: u.fee.paid,
					type: u.fee.type,
					amount: u.fee.amount ? Number(u.fee.amount) : null,
					currency: u.fee.currency,
					paidAt: u.fee.paidAt,
				}
			: null,
		submissionRoles: buildSubmissionRoles(u),
		surveyAnswers: u.surveyAnswers,
	}));

	return {
		users: mapped,
		total: mapped.length,
	};
}

export async function getUserById(id: string): Promise<AdminUserDetail | null> {
	const user = await prisma.user.findUnique({
		where: { id },
		include: userDetailInclude,
	});

	if (!user) return null;

	return {
		id: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		title: user.title,
		affiliation: user.affiliation?.name ?? null,
		affiliationId: user.affiliationId,
		orcid: user.orcid,
		address: user.address,
		country: user.country,
		needInvoice: user.needInvoice,
		role: user.role,
		isActive: user.isActive,
		allowLateSubmission: user.allowLateSubmission,
		emailVerified: user.emailVerified,
		createdAt: user.createdAt,
		lastLoginAt: user.lastLoginAt,
		fee: user.fee
			? {
					id: user.fee.id,
					userId: user.fee.userId,
					paid: user.fee.paid,
					type: user.fee.type,
					amount: user.fee.amount ? Number(user.fee.amount) : null,
					currency: user.fee.currency,
					paidAt: user.fee.paidAt,
				}
			: null,
		submissionRoles: buildSubmissionRoles(user),
		submissions: buildUserSubmissions(user),
		surveyAnswers: user.surveyAnswers,
	};
}

export interface BulkMarkFeesPaidInput {
	userIds: string[];
	feeType: string;
	amount: number;
	currency: string;
}

export async function bulkMarkFeesPaid(
	data: BulkMarkFeesPaidInput,
	performedBy?: string,
): Promise<{ success: boolean; updated: number }> {
	const now = new Date();
	let updated = 0;

	await prisma.$transaction(async (tx) => {
		for (const userId of data.userIds) {
			await tx.fee.upsert({
				where: { userId },
				update: {
					paid: true,
					type: data.feeType,
					amount: data.amount,
					currency: data.currency,
					paidAt: now,
				},
				create: {
					userId,
					paid: true,
					type: data.feeType,
					amount: data.amount,
					currency: data.currency,
					paidAt: now,
				},
			});
			await logActivityTx(tx, {
				type: "FEE_MARKED_PAID",
				userId,
				performedBy,
				detail: activityDetail("FEE_MARKED_PAID", {
					feeType: data.feeType,
					amount: data.amount,
					currency: data.currency,
				}),
			});
			updated++;
		}
	});

	return { success: true, updated };
}

export interface BulkChangeRoleInput {
	userIds: string[];
	role: UserRole;
}

export async function bulkChangeRole(
	data: BulkChangeRoleInput,
	performer: RoleChangePerformer,
): Promise<{ success: boolean; updated: number }> {
	await assertRoleChangeAllowed(performer, data.userIds, data.role);

	if (data.role !== "ADMIN") {
		const [adminCount, affectedAdmins] = await Promise.all([
			prisma.user.count({ where: { role: "ADMIN" } }),
			prisma.user.count({
				where: { id: { in: data.userIds }, role: "ADMIN" },
			}),
		]);
		if (adminCount - affectedAdmins < 1) {
			throw new Response("Cannot change role: would leave no admins", {
				status: 400,
			});
		}
	}

	// Fetch old roles for audit trail
	const oldUsers = await prisma.user.findMany({
		where: { id: { in: data.userIds } },
		select: { id: true, role: true },
	});

	// Exhibitor role is managed by the exhibitor lifecycle, not manual change
	const result = await prisma.user.updateMany({
		where: { id: { in: data.userIds }, role: { not: "EXHIBITOR" } },
		data: { role: data.role },
	});

	for (const user of oldUsers) {
		if (user.role !== data.role && user.role !== "EXHIBITOR") {
			await logActivity({
				type: "USER_ROLE_CHANGED",
				userId: user.id,
				performedBy: performer.id,
				detail: activityDetail("USER_ROLE_CHANGED", {
					fromRole: user.role,
					toRole: data.role,
				}),
			});
		}
	}

	return { success: true, updated: result.count };
}

/** Who is performing a role change — used for privilege checks + audit. */
export interface RoleChangePerformer {
	id: string;
	role: UserRole;
}

/**
 * Authorize a role change. Enforced centrally so the single-user and bulk
 * paths share identical rules:
 *  - nobody may change their own role (prevents self-escalation/lockout);
 *  - only an ADMIN may grant the ADMIN role;
 *  - a non-ADMIN (EDITOR) may not modify a user who is currently ADMIN.
 * Throws a 403 Response when the change is not permitted.
 */
async function assertRoleChangeAllowed(
	performer: RoleChangePerformer,
	targetUserIds: string[],
	newRole: UserRole,
): Promise<void> {
	if (targetUserIds.includes(performer.id)) {
		throw new Response("You cannot change your own role", { status: 403 });
	}
	if (performer.role !== "ADMIN") {
		if (newRole === "ADMIN") {
			throw new Response("Only an admin can grant the ADMIN role", {
				status: 403,
			});
		}
		const adminTargets = await prisma.user.count({
			where: { id: { in: targetUserIds }, role: "ADMIN" },
		});
		if (adminTargets > 0) {
			throw new Response("Only an admin can change an admin's role", {
				status: 403,
			});
		}
	}
}

export interface ChangeUserRoleInput {
	userId: string;
	role: UserRole;
}

export async function changeUserRole(
	data: ChangeUserRoleInput,
	performer: RoleChangePerformer,
): Promise<{ success: boolean }> {
	await assertRoleChangeAllowed(performer, [data.userId], data.role);

	const oldUser = await prisma.user.findUniqueOrThrow({
		where: { id: data.userId },
		select: { role: true },
	});

	// Exhibitor role is managed by the exhibitor lifecycle only.
	if (oldUser.role === "EXHIBITOR") {
		throw new Response("Cannot manually change an exhibitor's role", {
			status: 403,
		});
	}

	// Prevent demoting the last remaining admin (single-user path).
	if (oldUser.role === "ADMIN" && data.role !== "ADMIN") {
		const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
		if (adminCount <= 1) {
			throw new Response("Cannot change role: would leave no admins", {
				status: 400,
			});
		}
	}

	await prisma.$transaction(async (tx) => {
		await tx.user.update({
			where: { id: data.userId },
			data: { role: data.role },
		});

		await logActivityTx(tx, {
			type: "USER_ROLE_CHANGED",
			userId: data.userId,
			performedBy: performer.id,
			detail: activityDetail("USER_ROLE_CHANGED", {
				fromRole: oldUser.role,
				toRole: data.role,
			}),
		});
	});

	return { success: true };
}

export interface ToggleUserActiveInput {
	userId: string;
	isActive: boolean;
}

export async function toggleUserActive(
	data: ToggleUserActiveInput,
	performedBy?: string,
): Promise<{ success: boolean }> {
	await prisma.$transaction(async (tx) => {
		await tx.user.update({
			where: { id: data.userId },
			data: { isActive: data.isActive },
		});

		await logActivityTx(tx, {
			type: "USER_TOGGLED_ACTIVE",
			userId: data.userId,
			performedBy,
			detail: activityDetail("USER_TOGGLED_ACTIVE", {
				isActive: data.isActive,
			}),
		});
	});

	return { success: true };
}

export interface ToggleUserLateSubmissionInput {
	userId: string;
	allowLateSubmission: boolean;
}

export async function toggleUserLateSubmission(
	data: ToggleUserLateSubmissionInput,
	performedBy?: string,
): Promise<{ success: boolean }> {
	await prisma.$transaction(async (tx) => {
		await tx.user.update({
			where: { id: data.userId },
			data: { allowLateSubmission: data.allowLateSubmission },
		});

		await logActivityTx(tx, {
			type: "USER_TOGGLED_LATE_SUBMISSION",
			userId: data.userId,
			performedBy,
			detail: activityDetail("USER_TOGGLED_LATE_SUBMISSION", {
				allowLateSubmission: data.allowLateSubmission,
			}),
		});
	});

	return { success: true };
}

export interface MarkFeePaidInput {
	userId: string;
	feeType: string;
	amount: number;
	currency: string;
}

export async function markFeePaid(
	data: MarkFeePaidInput,
	performedBy?: string,
): Promise<{ success: boolean }> {
	const now = new Date();

	await prisma.$transaction(async (tx) => {
		await tx.fee.upsert({
			where: { userId: data.userId },
			update: {
				paid: true,
				type: data.feeType,
				amount: data.amount,
				currency: data.currency,
				paidAt: now,
			},
			create: {
				userId: data.userId,
				paid: true,
				type: data.feeType,
				amount: data.amount,
				currency: data.currency,
				paidAt: now,
			},
		});

		await logActivityTx(tx, {
			type: "FEE_MARKED_PAID",
			userId: data.userId,
			performedBy,
			detail: activityDetail("FEE_MARKED_PAID", {
				feeType: data.feeType,
				amount: data.amount,
				currency: data.currency,
			}),
		});
	});

	return { success: true };
}

export async function unmarkFeePaid(
	userId: string,
	performedBy?: string,
): Promise<{ success: boolean }> {
	await prisma.$transaction(async (tx) => {
		await tx.fee.update({
			where: { userId },
			data: { paid: false, paidAt: null },
		});

		await logActivityTx(tx, {
			type: "FEE_MARKED_UNPAID",
			userId,
			performedBy,
			detail: activityDetail("FEE_MARKED_UNPAID"),
		});
	});

	return { success: true };
}

export interface UpdateUserProfileInput {
	firstName: string;
	lastName: string;
	title?: string;
	email: string;
	affiliation?: string;
	orcid?: string;
	needInvoice?: boolean;
	address?: string;
	country?: string;
}

export async function updateUserProfile(
	userId: string,
	data: UpdateUserProfileInput,
): Promise<{ success: boolean }> {
	const currentUser = await prisma.user.findUnique({
		where: { id: userId },
		select: { email: true },
	});

	if (!currentUser) {
		throw new Response("User not found", { status: 404 });
	}

	const updateData: Prisma.UserUpdateInput = {
		firstName: data.firstName,
		lastName: data.lastName,
		title: data.title || null,
		orcid: data.orcid || null,
		needInvoice: data.needInvoice,
		address: data.address || null,
		country: data.country || null,
	};

	// Handle email change
	if (data.email !== currentUser.email) {
		const existing = await prisma.user.findUnique({
			where: { email: data.email },
		});
		if (existing) {
			throw new Response("Email already in use", { status: 409 });
		}
		updateData.email = data.email;
		updateData.emailVerified = false;
	}

	// Handle affiliation
	if (data.affiliation) {
		const affiliation = await upsertAffiliation(data.affiliation);
		updateData.affiliation = { connect: { id: affiliation.id } };
	} else {
		updateData.affiliation = { disconnect: true };
	}

	await prisma.user.update({
		where: { id: userId },
		data: updateData,
	});

	return { success: true };
}

export async function verifyUserEmail(
	userId: string,
	performedBy?: string,
): Promise<{ success: boolean }> {
	const user = await prisma.user.update({
		where: { id: userId },
		data: { emailVerified: true },
		select: { email: true },
	});

	await linkCoAuthorsByEmail(user.email, userId);

	await logActivity({
		type: "USER_EMAIL_VERIFIED",
		userId,
		performedBy,
		detail: activityDetail("USER_EMAIL_VERIFIED"),
	});

	return { success: true };
}

export interface DeletableCheck {
	deletable: boolean;
	reasons: string[];
}

export async function checkUserDeletable(
	userId: string,
): Promise<DeletableCheck> {
	const [submissions, reviews, editorDecisions] = await Promise.all([
		prisma.submission.count({ where: { userId } }),
		prisma.review.count({ where: { reviewerId: userId } }),
		prisma.editorDecision.count({ where: { editorId: userId } }),
	]);

	const reasons: string[] = [];
	if (submissions > 0) reasons.push(`${submissions} submission(s) as owner`);
	if (reviews > 0) reasons.push(`${reviews} review(s) as reviewer`);
	if (editorDecisions > 0)
		reasons.push(`${editorDecisions} editor decision(s)`);

	return { deletable: reasons.length === 0, reasons };
}

export async function deleteUser(
	userId: string,
	currentUserId: string,
): Promise<{ success: boolean }> {
	if (userId === currentUserId) {
		throw new Response("Cannot delete your own account", { status: 400 });
	}

	// Prevent deleting last admin
	const adminCount = await prisma.user.count({
		where: { role: "ADMIN" },
	});
	const targetUser = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});
	if (targetUser?.role === "ADMIN" && adminCount <= 1) {
		throw new Response("Cannot delete the last admin", { status: 400 });
	}

	const check = await checkUserDeletable(userId);
	if (!check.deletable) {
		throw new Response(`Cannot delete user: ${check.reasons.join(", ")}`, {
			status: 409,
		});
	}

	await prisma.$transaction(async (tx) => {
		await tx.submissionAuthor.updateMany({
			where: { userId },
			data: { userId: null },
		});
		await tx.activityLog.updateMany({
			where: { performedBy: userId },
			data: { performedBy: null },
		});
		await tx.file.updateMany({
			where: { uploadedById: userId },
			data: { uploadedById: null },
		});
		await tx.reviewAssignment.updateMany({
			where: { assignedBy: userId },
			data: { assignedBy: null },
		});
		await tx.sentReminder.deleteMany({ where: { userId } });
		await tx.invitation.deleteMany({ where: { createdById: userId } });

		const userToDelete = await tx.user.findUniqueOrThrow({
			where: { id: userId },
			select: { email: true },
		});

		await tx.activityLog.create({
			data: {
				type: "USER_DELETED",
				userId,
				performedBy: currentUserId,
				detail: activityDetail("USER_DELETED", {
					email: userToDelete.email,
				}),
			},
		});

		await tx.user.delete({ where: { id: userId } });
	});

	return { success: true };
}

// === Admin orchestration layer ===

export async function fetchUsers(
	filters: UsersFilters,
): Promise<GetUsersResponse> {
	return getUsers(filters);
}

export async function fetchUserById(
	id: string,
): Promise<AdminUserDetail | null> {
	return getUserById(id);
}

export interface PatchUserData {
	id: string;
	role?: UserRole;
	isActive?: boolean;
	allowLateSubmission?: boolean;
	markFeePaid?: boolean;
	feeType?: string;
	feeAmount?: number;
	feeCurrency?: string;
	unmarkFeePaid?: boolean;
	verifyEmail?: boolean;
}

export async function patchUser(
	data: PatchUserData,
	performer: RoleChangePerformer,
): Promise<AdminUserDetail | null> {
	const performedBy = performer.id;
	if (data.role !== undefined) {
		await changeUserRole({ userId: data.id, role: data.role }, performer);
	}

	if (data.isActive !== undefined) {
		await toggleUserActive(
			{
				userId: data.id,
				isActive: data.isActive,
			},
			performedBy,
		);
	}

	if (data.allowLateSubmission !== undefined) {
		await toggleUserLateSubmission(
			{
				userId: data.id,
				allowLateSubmission: data.allowLateSubmission,
			},
			performedBy,
		);
	}

	if (
		data.markFeePaid &&
		data.feeType &&
		data.feeAmount !== undefined &&
		data.feeCurrency
	) {
		await markFeePaid(
			{
				userId: data.id,
				feeType: data.feeType,
				amount: data.feeAmount,
				currency: data.feeCurrency,
			},
			performedBy,
		);
	}

	if (data.unmarkFeePaid) {
		await unmarkFeePaid(data.id, performedBy);
	}

	if (data.verifyEmail) {
		await verifyUserEmail(data.id, performedBy);
	}

	const changes = [
		data.role !== undefined && `role=${data.role}`,
		data.isActive !== undefined && `active=${data.isActive}`,
		data.allowLateSubmission !== undefined &&
			`allowLateSubmission=${data.allowLateSubmission}`,
		data.markFeePaid && "feePaid",
		data.unmarkFeePaid && "feeUnpaid",
		data.verifyEmail && "emailVerified",
	]
		.filter(Boolean)
		.join(", ");
	logger.info(`[admin] patchUser ${data.id}: ${changes}`);

	return getUserById(data.id);
}

export interface BulkActionData {
	action: "mark_fee" | "change_role";
	userIds: string[];
	feeType?: string;
	feeAmount?: number;
	feeCurrency?: string;
	role?: UserRole;
}

export async function executeBulkAction(
	data: BulkActionData,
	performer: RoleChangePerformer,
): Promise<{ success: boolean; updated: number }> {
	const performedBy = performer.id;
	if (data.action === "mark_fee") {
		if (!data.feeType || data.feeAmount === undefined || !data.feeCurrency) {
			throw new Response("Fee type, amount and currency are required", {
				status: 400,
			});
		}
		logger.info(`[admin] bulk mark_fee for ${data.userIds.length} users`);
		return bulkMarkFeesPaid(
			{
				userIds: data.userIds,
				feeType: data.feeType,
				amount: data.feeAmount,
				currency: data.feeCurrency,
			},
			performedBy,
		);
	}

	if (data.action === "change_role") {
		if (!data.role) {
			throw new Response("Role is required", { status: 400 });
		}
		logger.info(
			`[admin] bulk change_role to ${data.role} for ${data.userIds.length} users`,
		);
		return bulkChangeRole(
			{
				userIds: data.userIds,
				role: data.role,
			},
			performer,
		);
	}

	throw new Response("Invalid action", { status: 400 });
}

export async function adminUpdateProfile(
	userId: string,
	data: UpdateUserProfileInput,
): Promise<AdminUserDetail | null> {
	await updateUserProfile(userId, data);
	logger.info(`[admin] updateProfile ${userId}`);
	return getUserById(userId);
}

export async function adminCheckDeletable(
	userId: string,
): Promise<DeletableCheck> {
	return checkUserDeletable(userId);
}

export async function adminDeleteUser(
	userId: string,
	currentUserId: string,
): Promise<{ success: boolean }> {
	const result = await deleteUser(userId, currentUserId);
	logger.info(`[admin] deleteUser ${userId}`);
	return result;
}
