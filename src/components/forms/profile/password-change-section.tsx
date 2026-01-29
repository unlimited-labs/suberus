import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";
import { FieldError } from "@/components/forms/field-error";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useZodFormFieldOnChange } from "@/hooks/use-zod-form-field";
import type { PasswordChangeFormData } from "@/lib/validations/profile";

interface PasswordChangeSectionProps {
	onSave: (data: PasswordChangeFormData) => Promise<void>;
	isLoading?: boolean;
}

const passwordSchema = z
	.string()
	.min(1, "Password is required")
	.min(10, "Password must be at least 10 characters");

export function PasswordChangeSection({
	onSave,
	isLoading,
}: PasswordChangeSectionProps) {
	const [isValidationAttempted, setIsValidationAttempted] = useState(false);

	const form = useForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmNewPassword: "",
		},
		onSubmit: async ({ value }) => {
			await onSave(value);
			// Reset form after successful save
			form.reset();
			setIsValidationAttempted(false);
		},
	});

	const currentPasswordValidators = useZodFormFieldOnChange(
		z.string().min(1, "Current password is required"),
		isValidationAttempted,
	);
	const newPasswordValidators = useZodFormFieldOnChange(
		passwordSchema,
		isValidationAttempted,
	);

	const handleSubmit = async () => {
		setIsValidationAttempted(true);
		await form.handleSubmit();
	};

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
			}}
			className="space-y-4"
		>
			{/* Current Password */}
			<form.Field name="currentPassword" validators={currentPasswordValidators}>
				{(field) => (
					<div className="space-y-1">
						<Label htmlFor={field.name}>Current password *</Label>
						<PasswordInput
							id={field.name}
							hasError={field.state.meta.errors.length > 0}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(value) => field.handleChange(value)}
							disabled={isLoading}
						/>
						<FieldError errors={field.state.meta.errors} />
					</div>
				)}
			</form.Field>

			{/* New Password fields */}
			<div className="grid gap-3 sm:grid-cols-2">
				<form.Field name="newPassword" validators={newPasswordValidators}>
					{(field) => (
						<div className="space-y-1">
							<Label htmlFor={field.name}>New password *</Label>
							<PasswordInput
								id={field.name}
								placeholder="Min. 10 characters"
								hasError={field.state.meta.errors.length > 0}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(value) => field.handleChange(value)}
								disabled={isLoading}
							/>
							<FieldError errors={field.state.meta.errors} />
						</div>
					)}
				</form.Field>

				<form.Field
					name="confirmNewPassword"
					validators={{
						onSubmit: ({ value, fieldApi }) => {
							if (!value) return "Please confirm your new password";
							const newPassword = fieldApi.form.getFieldValue("newPassword");
							if (value !== newPassword) return "Passwords do not match";
							return undefined;
						},
						onChange: ({ value, fieldApi }) => {
							if (!isValidationAttempted) return undefined;
							if (!value) return "Please confirm your new password";
							const newPassword = fieldApi.form.getFieldValue("newPassword");
							if (value !== newPassword) return "Passwords do not match";
							return undefined;
						},
					}}
				>
					{(field) => (
						<div className="space-y-1">
							<Label htmlFor={field.name}>Confirm new password *</Label>
							<PasswordInput
								id={field.name}
								hasError={field.state.meta.errors.length > 0}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(value) => field.handleChange(value)}
								disabled={isLoading}
							/>
							<FieldError errors={field.state.meta.errors} />
						</div>
					)}
				</form.Field>
			</div>

			{/* Save button */}
			<div className="flex justify-end pt-2">
				<Button
					type="button"
					onClick={handleSubmit}
					disabled={form.state.isSubmitting || isLoading}
					className="h-9"
				>
					{form.state.isSubmitting ? "Changing password..." : "Change password"}
				</Button>
			</div>
		</form>
	);
}
