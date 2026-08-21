import {
	IconBrandLinkedin,
	IconBuilding,
	IconId,
	IconWorld,
} from "@tabler/icons-react";
import type { PersonalInfoFormData } from "@/features/profile/validations";
import { personalInfoSchema } from "@/features/profile/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { titleOptions } from "@/shared/lib/labels/title";

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
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<div className="grid gap-3 sm:grid-cols-2">
				<form.AppField name="firstName">
					{(field) => (
						<field.InputField
							disabled={isLoading}
							label="First name *"
							type="text"
						/>
					)}
				</form.AppField>

				<form.AppField name="lastName">
					{(field) => (
						<field.InputField
							disabled={isLoading}
							label="Last name *"
							type="text"
						/>
					)}
				</form.AppField>
			</div>

			<div className="grid gap-3 sm:grid-cols-[120px_1fr]">
				<form.AppField name="title">
					{(field) => (
						<field.SelectField
							disabled={isLoading}
							label="Title"
							options={titleOptions}
						/>
					)}
				</form.AppField>

				<form.AppField name="affiliation">
					{(field) => (
						<field.IconInputField
							disabled={isLoading}
							icon={<IconBuilding className="size-4" />}
							label="Affiliation"
							type="text"
						/>
					)}
				</form.AppField>
			</div>

			<form.AppField name="orcid">
				{(field) => (
					<field.IconInputField
						disabled={isLoading}
						icon={<IconId className="size-4" />}
						label="ORCID"
						type="text"
					/>
				)}
			</form.AppField>

			<form.AppField name="website">
				{(field) => (
					<field.IconInputField
						disabled={isLoading}
						icon={<IconWorld className="size-4" />}
						label="Website"
						type="text"
					/>
				)}
			</form.AppField>

			<form.AppField name="linkedin">
				{(field) => (
					<field.IconInputField
						disabled={isLoading}
						icon={<IconBrandLinkedin className="size-4" />}
						label="LinkedIn"
						type="text"
					/>
				)}
			</form.AppField>

			<div className="flex justify-end pt-2">
				<form.AppForm>
					<form.SubmitButton
						className="h-9"
						disabled={isLoading}
						label="Save changes"
						submittingLabel="Saving..."
					/>
				</form.AppForm>
			</div>
		</form>
	);
}
