import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	executeBulkAction,
	fetchUserById,
	fetchUsers,
	patchUser,
} from "./admin-users.server";
import { adminMiddleware } from "./auth.middleware";

const getUsersSchema = z.object({
	search: z.string().optional(),
	role: z.string().optional(),
	feePaid: z.enum(["true", "false"]).optional(),
});

export const getAdminUsers = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.inputValidator(getUsersSchema)
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
	.inputValidator(getUserByIdSchema)
	.handler(async ({ data }) => {
		const user = await fetchUserById(data.id);
		return user ?? null;
	});

const patchUserSchema = z.object({
	id: z.string(),
	role: z.enum(["ADMIN", "EDITOR", "REVIEWER", "AUTHOR"]).optional(),
	isActive: z.boolean().optional(),
	markFeePaid: z.boolean().optional(),
	feeType: z.enum(["FULL", "STUDENT", "INVITED", "STAFF", "CASH"]).optional(),
});

export const patchAdminUser = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(patchUserSchema)
	.handler(async ({ data }) => {
		return patchUser(data);
	});

const bulkActionSchema = z.object({
	action: z.enum(["mark_fee", "change_role"]),
	userIds: z.array(z.string()).min(1, "No users selected"),
	feeType: z.enum(["FULL", "STUDENT", "INVITED", "STAFF", "CASH"]).optional(),
	role: z.enum(["ADMIN", "EDITOR", "REVIEWER", "AUTHOR"]).optional(),
});

export const bulkAdminAction = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(bulkActionSchema)
	.handler(async ({ data }) => {
		return executeBulkAction(data);
	});
