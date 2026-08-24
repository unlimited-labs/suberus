import type { ComponentProps, ReactNode } from "react";
import { describedByIds } from "@/shared/hooks/use-field-error";
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
	labelAddon?: ReactNode;
	children: ReactNode;
}

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
			{description && (
				<FieldDescription id={describedByIds(htmlFor).description}>
					{description}
				</FieldDescription>
			)}
			<FieldError
				errors={hasError ? errors : undefined}
				id={describedByIds(htmlFor).error}
			/>
		</Field>
	);
}
