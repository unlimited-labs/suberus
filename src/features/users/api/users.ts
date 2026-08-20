import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
	adminMiddleware,
	adminOnlyMiddleware,
} from "@/features/auth/server/middleware";
import {
	createUserByAdmin,
	resendSetPasswordLink,
} from "@/features/users/server/create-user";
import {
	adminCheckDeletable,
	adminDeleteUser,
	adminUpdateProfile,
	executeBulkAction,
	getUserById,
	getUsers,
	patchUser,
} from "@/features/users/server/users";
import {
	userBulkActionInput,
	userCreateInput,
	userIdInput,
	userPatchInput,
	userProfileUpdateInput,
	usersListInput,
} from "@/features/users/validations";
import type { UserRole } from "@/generated/prisma/enums";

export const getAdminUsers = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(usersListInput)
	.handler(async ({ data }) => getUsers(data));

export const getAdminUserById = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(userIdInput)
	.handler(async ({ data }) => {
		const user = await getUserById(data.id);
		return user ?? null;
	});

export const adminUsersQueryOptions = () =>
	queryOptions({
		queryKey: ["admin", "users"],
		queryFn: async () => {
			const r = await getAdminUsers({ data: {} });
			return r.users;
		},
	});

export const adminUserDetailQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["admin", "users", id],
		queryFn: async () => {
			try {
				return await getAdminUserById({ data: { id } });
			} catch (e) {
				if (e instanceof Response && e.status === 404) return null;
				throw e;
			}
		},
	});

export const createAdminUser = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(userCreateInput)
	.handler(async ({ data, context }) => {
		return createUserByAdmin(data, context.user.id);
	});

export const resendSetPasswordEmail = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(userIdInput)
	.handler(async ({ data }) => {
		return resendSetPasswordLink(data.id);
	});

export const patchAdminUser = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(userPatchInput)
	.handler(async ({ data, context }) => {
		return patchUser(data, {
			id: context.user.id,
			// SAFETY: session role mirrors the DB enum column.
			role: context.user.role as UserRole,
		});
	});

export const bulkAdminAction = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(userBulkActionInput)
	.handler(async ({ data, context }) => {
		return executeBulkAction(data, {
			id: context.user.id,
			// SAFETY: session role mirrors the DB enum column.
			role: context.user.role as UserRole,
		});
	});

export const updateAdminUserProfile = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(userProfileUpdateInput)
	.handler(async ({ data }) => {
		const { id, ...profileData } = data;
		return adminUpdateProfile(id, profileData);
	});

export const checkAdminUserDeletable = createServerFn({ method: "GET" })
	.middleware([adminOnlyMiddleware])
	.validator(userIdInput)
	.handler(async ({ data }) => {
		return adminCheckDeletable(data.id);
	});

export const deleteAdminUser = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(userIdInput)
	.handler(async ({ data, context }) => {
		return adminDeleteUser(data.id, context.user.id);
	});
