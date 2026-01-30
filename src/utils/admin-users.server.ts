import type { FeeType, UserRole } from "@/generated/prisma";
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
} from "@/lib/server/admin/users";

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
	feeType?: FeeType;
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
	if (data.markFeePaid && data.feeType) {
		await markFeePaid({ userId: data.id, feeType: data.feeType });
	}

	return getUserById(data.id);
}

export interface BulkActionData {
	action: "mark_fee" | "change_role";
	userIds: string[];
	feeType?: FeeType;
	role?: UserRole;
}

export async function executeBulkAction(
	data: BulkActionData,
): Promise<{ success: boolean; updated: number }> {
	if (data.action === "mark_fee") {
		if (!data.feeType) {
			throw new Error("Fee type is required");
		}
		return bulkMarkFeesPaid({
			userIds: data.userIds,
			feeType: data.feeType,
		});
	}

	if (data.action === "change_role") {
		if (!data.role) {
			throw new Error("Role is required");
		}
		return bulkChangeRole({
			userIds: data.userIds,
			role: data.role,
		});
	}

	throw new Error("Invalid action");
}
