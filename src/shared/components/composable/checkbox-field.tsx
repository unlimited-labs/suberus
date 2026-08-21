import { useSelector } from "@tanstack/react-store";
import type * as React from "react";
import { useFieldContext } from "@/shared/hooks/form-context";
import { Checkbox } from "@/shared/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/shared/ui/field";

interface FormCheckboxFieldProps {
	label: string | React.ReactNode;
	labelClassName?: string;
	className?: string;
}

export function FormCheckboxField({
	label,
	labelClassName,
	className,
}: FormCheckboxFieldProps) {
	const field = useFieldContext<boolean>();
	const submissionAttempts = useSelector(
		field.form.store,
		(s) => s.submissionAttempts,
	);
	const hasError =
		(field.state.meta.isBlurred || submissionAttempts > 0) &&
		field.state.meta.errors.length > 0;

	return (
		<Field className={className} orientation="horizontal">
			<Checkbox
				checked={field.state.value}
				id={field.name}
				onCheckedChange={(checked) => field.handleChange(checked === true)}
			/>
			<FieldLabel
				className={
					labelClassName ??
					"text-muted-foreground cursor-pointer text-sm font-normal"
				}
				htmlFor={field.name}
			>
				{label}
			</FieldLabel>
			<FieldError errors={hasError ? field.state.meta.errors : undefined} />
		</Field>
	);
}
