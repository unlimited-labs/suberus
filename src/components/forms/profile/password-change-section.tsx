import { useAppForm } from "@/hooks/use-app-form";
import type { PasswordChangeFormData } from "@/lib/validations/profile";
import { passwordChangeSchema } from "@/lib/validations/profile";

interface PasswordChangeSectionProps {
	onSave: (data: PasswordChangeFormData) => Promise<void>;
	isLoading?: boolean;
}

export function PasswordChangeSection({
	onSave,
	isLoading,
}: PasswordChangeSectionProps) {
	const form = useAppForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmNewPassword: "",
		},
		validators: {
			onChange: passwordChangeSchema,
			onSubmit: passwordChangeSchema,
		},
		onSubmit: async ({ value }) => {
			await onSave(value);
			form.reset();
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void form.handleSubmit();
			}}
			className="space-y-4"
		>
			{/* Current Password */}
			<form.AppField name="currentPassword">
				{(field) => (
					<field.PasswordField
						label="Current password *"
						disabled={isLoading}
					/>
				)}
			</form.AppField>

			{/* New Password fields */}
			<div className="grid gap-3 sm:grid-cols-2">
				<form.AppField name="newPassword">
					{(field) => (
						<field.PasswordField
							label="New password *"
							placeholder="Min. 10 characters"
							disabled={isLoading}
						/>
					)}
				</form.AppField>

				<form.AppField name="confirmNewPassword">
					{(field) => (
						<field.PasswordField
							label="Confirm new password *"
							disabled={isLoading}
						/>
					)}
				</form.AppField>
			</div>

			{/* Save button */}
			<div className="flex justify-end pt-2">
				<form.AppForm>
					<form.SubmitButton
						label="Change password"
						submittingLabel="Changing password..."
						disabled={isLoading}
						className="h-9"
					/>
				</form.AppForm>
			</div>
		</form>
	);
}
