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
		<Field orientation="horizontal" className={className}>
			<Checkbox
				id={field.name}
				checked={field.state.value}
				onCheckedChange={(checked) => field.handleChange(checked === true)}
			/>
			<FieldLabel
				htmlFor={field.name}
				className={
					labelClassName ??
					"cursor-pointer text-sm font-normal text-muted-foreground"
				}
			>
				{label}
			</FieldLabel>
			<FieldError errors={hasError ? field.state.meta.errors : undefined} />
		</Field>
	);
}
