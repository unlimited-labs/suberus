import { z } from "zod";
import { UserRole } from "@/generated/prisma/enums";
import {
	contactInfoSchema,
	personalInfoSchema,
} from "@/shared/lib/validations/user";

// EXHIBITOR is granted by the exhibitor flow, never by a role change; the
// filter below still spans every role.
export const userRoleSchema = z.enum(["ADMIN", "EDITOR", "REVIEWER", "AUTHOR"]);

export const userRoleFilterSchema = z.enum(UserRole);

export const userIdInput = z.object({ id: z.uuid() });

export const usersListInput = z.object({
	search: z.string().optional(),
	role: z.array(userRoleFilterSchema).optional(),
	feePaid: z.boolean().optional(),
	take: z.number().int().positive().max(200).optional(),
	skip: z.number().int().nonnegative().optional(),
});

const surveyAnswersInput = z.array(
	z.object({ questionId: z.uuid(), value: z.string().max(500) }),
);

export const userCreateInput = personalInfoSchema
	.omit({ orcid: true })
	.extend(contactInfoSchema.shape)
	.extend({
		answers: surveyAnswersInput,
		sendSetPasswordEmail: z.boolean().default(true),
	});

export const userProfileUpdateInput = personalInfoSchema
	.extend(contactInfoSchema.shape)
	.extend(userIdInput.shape);

export const userPatchInput = userIdInput.extend({
	role: userRoleSchema.optional(),
	isActive: z.boolean().optional(),
	allowLateSubmission: z.boolean().optional(),
	markFeePaid: z.boolean().optional(),
	feeType: z.string().optional(),
	feeAmount: z.number().optional(),
	feeCurrency: z.string().optional(),
	unmarkFeePaid: z.boolean().optional(),
	verifyEmail: z.boolean().optional(),
});

export const feeMarkPaidInput = userIdInput.extend({
	feeType: z.string().optional(),
});

export const userBulkActionInput = z.object({
	action: z.enum(["mark_fee", "change_role"]),
	userIds: z.array(z.string()).min(1, "No users selected"),
	feeType: z.string().optional(),
	feeAmount: z.number().optional(),
	feeCurrency: z.string().optional(),
	role: userRoleSchema.optional(),
});

// Derived from the wire schemas: a renamed field fails to compile instead of
// silently dropping at the boundary.
export const adminUserCreateSchema = userCreateInput
	.omit({ answers: true, sendSetPasswordEmail: true })
	.extend({ surveyAnswers: z.record(z.string(), z.string()) });

export const adminUserEditSchema = userProfileUpdateInput.omit({ id: true });

export type AdminUserCreateFormData = z.infer<typeof adminUserCreateSchema>;
export type AdminUserEditFormData = z.infer<typeof adminUserEditSchema>;
