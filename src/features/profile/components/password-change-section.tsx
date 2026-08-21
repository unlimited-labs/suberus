import type { PasswordChangeFormData } from "@/features/profile/validations";
import { passwordChangeSchema } from "@/features/profile/validations";
import { PasswordFieldsGroup } from "@/shared/components/composable/password-fields-group";
import { useAppForm } from "@/shared/hooks/use-app-form";

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
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<form.AppField name="currentPassword">
				{(field) => (
					<field.PasswordField
						disabled={isLoading}
						label="Current password *"
					/>
				)}
			</form.AppField>

			<PasswordFieldsGroup
				confirmLabel="Confirm new password *"
				disabled={isLoading}
				fields={{ password: "newPassword", confirm: "confirmNewPassword" }}
				form={form}
				passwordLabel="New password *"
				passwordPlaceholder="Min. 10 characters"
				twoColumn
			/>

			<div className="flex justify-end pt-2">
				<form.AppForm>
					<form.SubmitButton
						className="h-9"
						disabled={isLoading}
						label="Change password"
						submittingLabel="Changing password..."
					/>
				</form.AppForm>
			</div>
		</form>
	);
}
