import { prisma } from "@/db";
import type { Prisma } from "@/generated/prisma/client";
import type { FeeType, UserRole } from "@/generated/prisma/enums";
import { linkCoAuthorsByEmail } from "@/utils/submissions.server";

export interface AdminUser {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	title: string | null;
	affiliation: string | null;
	role: UserRole;
	isActive: boolean;
	emailVerified: boolean;
	createdAt: Date;
	lastLoginAt: Date | null;
	fee: {
		id: string;
		userId: string;
		paid: boolean;
		type: FeeType;
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
					paidAt: user.fee.paidAt,
				}
			: null,
	};
}

export interface BulkMarkFeesPaidInput {
	userIds: string[];
	feeType: FeeType;
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
					paidAt: now,
				},
				create: {
					userId,
					paid: true,
					type: data.feeType,
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
	feeType: FeeType;
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
			paidAt: now,
		},
		create: {
			userId: data.userId,
			paid: true,
			type: data.feeType,
			paidAt: now,
		},
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
