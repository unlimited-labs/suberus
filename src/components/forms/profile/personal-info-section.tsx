import { IconBuilding, IconId } from "@tabler/icons-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useAppForm } from "@/hooks/use-app-form";
import { useZodFormFieldOnChange } from "@/hooks/use-zod-form-field";
import type { PersonalInfoFormData } from "@/lib/validations/profile";

const TITLE_OPTIONS = [
	{ value: "dr", label: "Dr" },
	{ value: "prof", label: "Prof" },
	{ value: "prof-dr", label: "Prof. Dr" },
	{ value: "dr-hab", label: "Dr hab." },
	{ value: "mgr", label: "MSc" },
	{ value: "inz", label: "Eng" },
	{ value: "lic", label: "BSc" },
] as const;

interface PersonalInfoSectionProps {
	initialData: PersonalInfoFormData;
	onSave: (data: PersonalInfoFormData) => Promise<void>;
	isLoading?: boolean;
}

const requiredString = (field: string) =>
	z.string().min(1, `${field} is required`);
const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/;

export function PersonalInfoSection({
	initialData,
	onSave,
	isLoading,
}: PersonalInfoSectionProps) {
	const [isValidationAttempted, setIsValidationAttempted] = useState(false);

	const form = useAppForm({
		defaultValues: initialData,
		onSubmit: async ({ value }) => {
			await onSave(value);
		},
	});

	const firstNameValidators = useZodFormFieldOnChange(
		requiredString("First name").min(
			2,
			"First name must be at least 2 characters",
		),
		isValidationAttempted,
	);
	const lastNameValidators = useZodFormFieldOnChange(
		requiredString("Last name").min(
			2,
			"Last name must be at least 2 characters",
		),
		isValidationAttempted,
	);
	const affiliationValidators = useZodFormFieldOnChange(
		z
			.string()
			.max(200, "Affiliation must be at most 200 characters")
			.optional(),
		isValidationAttempted,
	);
	const orcidValidators = useZodFormFieldOnChange(
		z
			.string()
			.regex(orcidRegex, "Invalid ORCID format (e.g., 0000-0002-1825-0097)")
			.optional()
			.or(z.literal("")),
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
			{/* Name fields */}
			<div className="grid gap-3 sm:grid-cols-2">
				<form.AppField name="firstName" validators={firstNameValidators}>
					{(field) => (
						<field.InputField
							label="First name *"
							type="text"
							disabled={isLoading}
						/>
					)}
				</form.AppField>

				<form.AppField name="lastName" validators={lastNameValidators}>
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
							options={TITLE_OPTIONS}
							disabled={isLoading}
						/>
					)}
				</form.AppField>

				<form.AppField name="affiliation" validators={affiliationValidators}>
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
			<form.AppField name="orcid" validators={orcidValidators}>
				{(field) => (
					<field.IconInputField
						label="ORCID"
						type="text"
						icon={<IconId className="size-4" />}
						placeholder="0000-0002-1825-0097"
						disabled={isLoading}
					/>
				)}
			</form.AppField>

			{/* Save button */}
			<div className="flex justify-end pt-2">
				<Button
					type="button"
					onClick={handleSubmit}
					disabled={form.state.isSubmitting || isLoading}
					className="h-9"
				>
					{form.state.isSubmitting ? "Saving..." : "Save changes"}
				</Button>
			</div>
		</form>
	);
}
