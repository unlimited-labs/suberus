import type { ComponentProps, ReactNode } from "react";

import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/shared/ui/field";

interface FormFieldProps {
	label: string;
	htmlFor: string;
	hasError: boolean;
	errors: ComponentProps<typeof FieldError>["errors"];
	description?: string;
	/** Extra content rendered to the right of the label (e.g. a character counter). */
	labelAddon?: ReactNode;
	children: ReactNode;
}

/** Shared shell for composable form fields: label, input slot, description and error. */
export function FormField({
	label,
	htmlFor,
	hasError,
	errors,
	description,
	labelAddon,
	children,
}: FormFieldProps) {
	return (
		<Field data-invalid={hasError}>
			{labelAddon ? (
				<div className="flex items-center justify-between">
					<FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
					{labelAddon}
				</div>
			) : (
				<FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
			)}
			{children}
			{description && <FieldDescription>{description}</FieldDescription>}
			<FieldError errors={hasError ? errors : undefined} />
		</Field>
	);
}
