import { IconBuilding, IconId } from "@tabler/icons-react";
import type { PersonalInfoFormData } from "@/features/profile/validations";
import { personalInfoSchema } from "@/features/profile/validations";
import { useAppForm } from "@/hooks/use-app-form";
import { titleOptions } from "@/lib/labels";

interface PersonalInfoSectionProps {
	initialData: PersonalInfoFormData;
	onSave: (data: PersonalInfoFormData) => Promise<void>;
	isLoading?: boolean;
}

export function PersonalInfoSection({
	initialData,
	onSave,
	isLoading,
}: PersonalInfoSectionProps) {
	const form = useAppForm({
		defaultValues: initialData,
		validators: {
			onChange: personalInfoSchema,
			onSubmit: personalInfoSchema,
		},
		onSubmit: async ({ value }) => {
			await onSave(value);
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
			{/* Name fields */}
			<div className="grid gap-3 sm:grid-cols-2">
				<form.AppField name="firstName">
					{(field) => (
						<field.InputField
							label="First name *"
							type="text"
							disabled={isLoading}
						/>
					)}
				</form.AppField>

				<form.AppField name="lastName">
					{(field) => (
						<field.InputField
							label="Last name *"
							type="text"
							disabled={isLoading}
						/>
					)}
				</form.AppField>
			</div>

			{/* Title + Affiliation */}
			<div className="grid gap-3 sm:grid-cols-[120px_1fr]">
				<form.AppField name="title">
					{(field) => (
						<field.SelectField
							label="Title"
							options={titleOptions}
							disabled={isLoading}
						/>
					)}
				</form.AppField>

				<form.AppField name="affiliation">
					{(field) => (
						<field.IconInputField
							label="Affiliation"
							type="text"
							icon={<IconBuilding className="size-4" />}
							disabled={isLoading}
						/>
					)}
				</form.AppField>
			</div>

			{/* ORCID */}
			<form.AppField name="orcid">
				{(field) => (
					<field.IconInputField
						label="ORCID"
						type="text"
						icon={<IconId className="size-4" />}
						disabled={isLoading}
					/>
				)}
			</form.AppField>

			{/* Save button */}
			<div className="flex justify-end pt-2">
				<form.AppForm>
					<form.SubmitButton
						label="Save changes"
						submittingLabel="Saving..."
						disabled={isLoading}
						className="h-9"
					/>
				</form.AppForm>
			</div>
		</form>
	);
}
