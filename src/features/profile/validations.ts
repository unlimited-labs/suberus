import { z } from "zod";

export type {
	ContactInfoFormData,
	PersonalInfoFormData,
} from "@/shared/lib/validations/user";
export {
	contactInfoSchema,
	personalInfoSchema,
} from "@/shared/lib/validations/user";

export const passwordChangeSchema = z.object({
	currentPassword: z.string().min(1, "Current password is required"),
	newPassword: z
		.string()
		.min(1, "New password is required")
		.min(10, "Password must be at least 10 characters"),
	confirmNewPassword: z.string().min(1, "Please confirm your new password"),
});

export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
