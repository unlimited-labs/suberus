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
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void form.handleSubmit();
			}}
			className="space-y-4"
		>
			<form.AppField name="currentPassword">
				{(field) => (
					<field.PasswordField
						label="Current password *"
						disabled={isLoading}
					/>
				)}
			</form.AppField>

			<PasswordFieldsGroup
				form={form}
				fields={{ password: "newPassword", confirm: "confirmNewPassword" }}
				passwordLabel="New password *"
				passwordPlaceholder="Min. 10 characters"
				confirmLabel="Confirm new password *"
				disabled={isLoading}
				twoColumn
			/>

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
