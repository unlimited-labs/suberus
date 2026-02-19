import { prisma } from "@/db.server";
import type { Prisma } from "@/generated/prisma/client";
import type { UserRole } from "@/generated/prisma/enums";
import { upsertAffiliation } from "@/utils/affiliations.server";
import { linkCoAuthorsByEmail } from "@/utils/submissions.server";

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
	role: UserRole;
	isActive: boolean;
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
		role: u.role,
		isActive: u.isActive,
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
	}));

	return {
		users: mapped,
		total: mapped.length,
	};
}

export async function getUserById(id: string): Promise<AdminUser | null> {
	const user = await prisma.user.findUnique({
		where: { id },
		include: {
			fee: true,
			affiliation: true,
		},
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
		role: user.role,
		isActive: user.isActive,
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
): Promise<{ success: boolean; updated: number }> {
	const result = await prisma.user.updateMany({
		where: { id: { in: data.userIds } },
		data: { role: data.role },
	});

	return { success: true, updated: result.count };
}

export interface ChangeUserRoleInput {
	userId: string;
	role: UserRole;
}

export async function changeUserRole(
	data: ChangeUserRoleInput,
): Promise<{ success: boolean }> {
	await prisma.user.update({
		where: { id: data.userId },
		data: { role: data.role },
	});

	return { success: true };
}

export interface ToggleUserActiveInput {
	userId: string;
	isActive: boolean;
}

export async function toggleUserActive(
	data: ToggleUserActiveInput,
): Promise<{ success: boolean }> {
	await prisma.user.update({
		where: { id: data.userId },
		data: { isActive: data.isActive },
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
): Promise<{ success: boolean }> {
	const now = new Date();

	await prisma.fee.upsert({
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

	return { success: true };
}

export async function unmarkFeePaid(
	userId: string,
): Promise<{ success: boolean }> {
	await prisma.fee.update({
		where: { userId },
		data: { paid: false, paidAt: null },
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
): Promise<{ success: boolean }> {
	const user = await prisma.user.update({
		where: { id: userId },
		data: { emailVerified: true },
		select: { email: true },
	});

	await linkCoAuthorsByEmail(user.email, userId);

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
		await tx.user.delete({ where: { id: userId } });
	});

	return { success: true };
}
