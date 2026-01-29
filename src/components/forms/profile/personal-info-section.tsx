import { IconBuilding, IconId } from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";
import { FieldError } from "@/components/forms/field-error";
import { IconInput } from "@/components/forms/icon-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useZodFormFieldOnChange } from "@/hooks/use-zod-form-field";
import { cn } from "@/lib/utils";
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

	const form = useForm({
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
				<form.Field name="firstName" validators={firstNameValidators}>
					{(field) => (
						<div className="space-y-1">
							<Label htmlFor={field.name}>First name *</Label>
							<Input
								id={field.name}
								type="text"
								className={cn(
									"h-9",
									field.state.meta.errors.length > 0 && "border-destructive",
								)}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								disabled={isLoading}
							/>
							<FieldError errors={field.state.meta.errors} />
						</div>
					)}
				</form.Field>

				<form.Field name="lastName" validators={lastNameValidators}>
					{(field) => (
						<div className="space-y-1">
							<Label htmlFor={field.name}>Last name *</Label>
							<Input
								id={field.name}
								type="text"
								className={cn(
									"h-9",
									field.state.meta.errors.length > 0 && "border-destructive",
								)}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								disabled={isLoading}
							/>
							<FieldError errors={field.state.meta.errors} />
						</div>
					)}
				</form.Field>
			</div>

			{/* Title + Affiliation */}
			<div className="grid gap-3 sm:grid-cols-[120px_1fr]">
				<form.Field name="title">
					{(field) => (
						<div className="space-y-1">
							<Label htmlFor={field.name}>Title</Label>
							<Select
								value={field.state.value || ""}
								onValueChange={(value) => field.handleChange(value)}
								disabled={isLoading}
							>
								<SelectTrigger className="h-9">
									<SelectValue placeholder="—" />
								</SelectTrigger>
								<SelectContent>
									{TITLE_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				</form.Field>

				<form.Field name="affiliation" validators={affiliationValidators}>
					{(field) => (
						<div className="space-y-1">
							<Label htmlFor={field.name}>Affiliation</Label>
							<IconInput
								id={field.name}
								type="text"
								icon={<IconBuilding className="size-4" />}
								hasError={field.state.meta.errors.length > 0}
								value={field.state.value || ""}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								disabled={isLoading}
							/>
							<FieldError errors={field.state.meta.errors} />
						</div>
					)}
				</form.Field>
			</div>

			{/* ORCID */}
			<form.Field name="orcid" validators={orcidValidators}>
				{(field) => (
					<div className="space-y-1">
						<Label htmlFor={field.name}>ORCID</Label>
						<IconInput
							id={field.name}
							type="text"
							icon={<IconId className="size-4" />}
							placeholder="0000-0002-1825-0097"
							hasError={field.state.meta.errors.length > 0}
							value={field.state.value || ""}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							disabled={isLoading}
						/>
						<FieldError errors={field.state.meta.errors} />
					</div>
				)}
			</form.Field>

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
