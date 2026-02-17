import type { UserRole } from "@/generated/prisma/enums";
import {
	type AdminUser,
	bulkChangeRole,
	bulkMarkFeesPaid,
	changeUserRole,
	type GetUsersResponse,
	getUserById,
	getUsers,
	markFeePaid,
	toggleUserActive,
	type UsersFilters,
	unmarkFeePaid,
	verifyUserEmail,
} from "@/lib/server/admin/users";
import { logger } from "@/logger.ts";

export type { AdminUser, GetUsersResponse, UsersFilters };

export async function fetchUsers(
	filters: UsersFilters,
): Promise<GetUsersResponse> {
	return getUsers(filters);
}

export async function fetchUserById(id: string): Promise<AdminUser | null> {
	return getUserById(id);
}

export interface PatchUserData {
	id: string;
	role?: UserRole;
	isActive?: boolean;
	markFeePaid?: boolean;
	feeType?: string;
	feeAmount?: number;
	feeCurrency?: string;
	unmarkFeePaid?: boolean;
	verifyEmail?: boolean;
}

export async function patchUser(
	data: PatchUserData,
): Promise<AdminUser | null> {
	// Change role
	if (data.role !== undefined) {
		await changeUserRole({ userId: data.id, role: data.role });
	}

	// Toggle active
	if (data.isActive !== undefined) {
		await toggleUserActive({
			userId: data.id,
			isActive: data.isActive,
		});
	}

	// Mark fee paid
	if (
		data.markFeePaid &&
		data.feeType &&
		data.feeAmount !== undefined &&
		data.feeCurrency
	) {
		await markFeePaid({
			userId: data.id,
			feeType: data.feeType,
			amount: data.feeAmount,
			currency: data.feeCurrency,
		});
	}

	// Unmark fee paid
	if (data.unmarkFeePaid) {
		await unmarkFeePaid(data.id);
	}

	// Verify email
	if (data.verifyEmail) {
		await verifyUserEmail(data.id);
	}

	const changes = [
		data.role !== undefined && `role=${data.role}`,
		data.isActive !== undefined && `active=${data.isActive}`,
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
): Promise<{ success: boolean; updated: number }> {
	if (data.action === "mark_fee") {
		if (!data.feeType || data.feeAmount === undefined || !data.feeCurrency) {
			throw new Response("Fee type, amount and currency are required", {
				status: 400,
			});
		}
		logger.info(`[admin] bulk mark_fee for ${data.userIds.length} users`);
		return bulkMarkFeesPaid({
			userIds: data.userIds,
			feeType: data.feeType,
			amount: data.feeAmount,
			currency: data.feeCurrency,
		});
	}

	if (data.action === "change_role") {
		if (!data.role) {
			throw new Response("Role is required", { status: 400 });
		}
		logger.info(
			`[admin] bulk change_role to ${data.role} for ${data.userIds.length} users`,
		);
		return bulkChangeRole({
			userIds: data.userIds,
			role: data.role,
		});
	}

	throw new Response("Invalid action", { status: 400 });
}
