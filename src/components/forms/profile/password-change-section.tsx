import { Button } from "@/components/ui/button";
import { useAppForm } from "@/hooks/use-app-form";
import { submitForm } from "@/lib/form-utils";
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
				void submitForm(form);
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
							description="Min. 10 characters"
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
				<Button
					type="submit"
					disabled={form.state.isSubmitting || isLoading}
					className="h-9"
				>
					{form.state.isSubmitting ? "Changing password..." : "Change password"}
				</Button>
			</div>
		</form>
	);
}
