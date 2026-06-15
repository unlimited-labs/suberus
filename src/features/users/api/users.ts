import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	adminMiddleware,
	adminOnlyMiddleware,
} from "@/features/auth/server/middleware";
import {
	adminCheckDeletable,
	adminDeleteUser,
	adminUpdateProfile,
	executeBulkAction,
	fetchUserById,
	fetchUsers,
	patchUser,
} from "@/features/users/server/users";
import type { UserRole } from "@/generated/prisma/enums";

const getUsersSchema = z.object({
	search: z.string().optional(),
	role: z.string().optional(),
	feePaid: z.enum(["true", "false"]).optional(),
});

export const getAdminUsers = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(getUsersSchema)
	.handler(async ({ data }) => {
		const role = data.role
			? (data.role.split(",") as Array<
					"ADMIN" | "EDITOR" | "REVIEWER" | "AUTHOR"
				>)
			: undefined;

		const feePaid =
			data.feePaid === "true"
				? true
				: data.feePaid === "false"
					? false
					: undefined;

		return fetchUsers({ search: data.search, role, feePaid });
	});

const getUserByIdSchema = z.object({
	id: z.string(),
});

export const getAdminUserById = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(getUserByIdSchema)
	.handler(async ({ data }) => {
		const user = await fetchUserById(data.id);
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

const patchUserSchema = z.object({
	id: z.string(),
	role: z.enum(["ADMIN", "EDITOR", "REVIEWER", "AUTHOR"]).optional(),
	isActive: z.boolean().optional(),
	allowLateSubmission: z.boolean().optional(),
	markFeePaid: z.boolean().optional(),
	feeType: z.string().optional(),
	feeAmount: z.number().optional(),
	feeCurrency: z.string().optional(),
	unmarkFeePaid: z.boolean().optional(),
	verifyEmail: z.boolean().optional(),
});

export const patchAdminUser = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(patchUserSchema)
	.handler(async ({ data, context }) => {
		return patchUser(data, {
			id: context.user.id,
			role: context.user.role as UserRole,
		});
	});

const bulkActionSchema = z.object({
	action: z.enum(["mark_fee", "change_role"]),
	userIds: z.array(z.string()).min(1, "No users selected"),
	feeType: z.string().optional(),
	feeAmount: z.number().optional(),
	feeCurrency: z.string().optional(),
	role: z.enum(["ADMIN", "EDITOR", "REVIEWER", "AUTHOR"]).optional(),
});

export const bulkAdminAction = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(bulkActionSchema)
	.handler(async ({ data, context }) => {
		return executeBulkAction(data, {
			id: context.user.id,
			role: context.user.role as UserRole,
		});
	});

// --- Admin-only: profile edit, delete, deletable check ---

const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/;

const adminEditProfileSchema = z.object({
	id: z.string(),
	firstName: z.string().min(2).max(50),
	lastName: z.string().min(2).max(50),
	title: z.string().optional(),
	affiliation: z.string().max(200).optional(),
	orcid: z
		.string()
		.regex(orcidRegex, "Invalid ORCID format")
		.optional()
		.or(z.literal("")),
	email: z.email(),
	needInvoice: z.boolean().optional(),
	address: z.string().max(500).optional(),
	country: z.string().optional(),
});

export const updateAdminUserProfile = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(adminEditProfileSchema)
	.handler(async ({ data }) => {
		const { id, ...profileData } = data;
		return adminUpdateProfile(id, profileData);
	});

const userIdSchema = z.object({ id: z.string() });

export const checkAdminUserDeletable = createServerFn({ method: "GET" })
	.middleware([adminOnlyMiddleware])
	.validator(userIdSchema)
	.handler(async ({ data }) => {
		return adminCheckDeletable(data.id);
	});

export const deleteAdminUser = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(userIdSchema)
	.handler(async ({ data, context }) => {
		return adminDeleteUser(data.id, context.user.id);
	});
