import { PasswordFieldsGroup } from "@/components/forms/composable/password-fields-group";
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
			<PasswordFieldsGroup
				form={form}
				fields={{ password: "newPassword", confirm: "confirmNewPassword" }}
				passwordLabel="New password *"
				passwordPlaceholder="Min. 10 characters"
				confirmLabel="Confirm new password *"
				disabled={isLoading}
				twoColumn
			/>

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
