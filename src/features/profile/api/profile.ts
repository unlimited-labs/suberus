import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { logActivity } from "@/features/activity-log/server/activity-log";
import {
	getPersonalInfo,
	updateContactInfo,
	updatePersonalInfo,
} from "@/features/profile/server/profile";
import { authMiddleware } from "@/shared/server/middleware/auth";
import { auth } from "../../../../auth.server";

const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/;

// Personal info
export const personalInfoQueryOptions = () =>
	queryOptions({
		queryKey: ["profile", "personal-info"],
		queryFn: () => getPersonalInfoFn(),
	});

export const getPersonalInfoFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => getPersonalInfo(context.user.id));

export const updatePersonalInfoFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(
		z.object({
			firstName: z.string().min(2).max(50),
			lastName: z.string().min(2).max(50),
			title: z.string().optional(),
			affiliationId: z.uuid().optional().or(z.literal("")),
			orcid: z.string().regex(orcidRegex).optional().or(z.literal("")),
		}),
	)
	.handler(async ({ data, context }) => {
		await updatePersonalInfo(context.user.id, {
			firstName: data.firstName,
			lastName: data.lastName,
			title: data.title,
			affiliationId: data.affiliationId || undefined,
			orcid: data.orcid || undefined,
		});
		return { success: true };
	});

// Contact info
export const updateContactInfoFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(
		z.object({
			needInvoice: z.boolean().optional(),
			address: z.string().max(500).optional(),
			country: z.string().optional(),
		}),
	)
	.handler(async ({ data, context }) => {
		await updateContactInfo(context.user.id, data);
		return { success: true };
	});

// Email change (better-auth)
export const changeEmailFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(
		z.object({
			newEmail: z.email(),
		}),
	)
	.handler(async ({ data }) => {
		await auth.api.changeEmail({
			body: {
				newEmail: data.newEmail,
			},
			headers: getRequestHeaders(),
		});
		return { success: true };
	});

// Password change (better-auth)
export const changePasswordFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(
		z.object({
			currentPassword: z.string(),
			newPassword: z.string().min(10),
		}),
	)
	.handler(async ({ data, context }) => {
		await auth.api.changePassword({
			body: {
				currentPassword: data.currentPassword,
				newPassword: data.newPassword,
				revokeOtherSessions: false,
			},
			headers: getRequestHeaders(),
		});
		await logActivity({
			type: "USER_PASSWORD_CHANGED",
			userId: context.user.id,
			performedBy: context.user.id,
		});
		return { success: true };
	});
