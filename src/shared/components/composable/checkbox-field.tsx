import type * as React from "react";
import {
	describedByIds,
	fieldAria,
	useFieldError,
} from "@/shared/hooks/use-field-error";
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
	const { field, errors, hasError } = useFieldError<boolean>();

	return (
		<Field className={className} orientation="horizontal">
			<Checkbox
				checked={field.state.value}
				id={field.name}
				onBlur={field.handleBlur}
				onCheckedChange={(checked) => field.handleChange(checked === true)}
				{...fieldAria(field.name, hasError, false)}
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
			<FieldError
				errors={hasError ? errors : undefined}
				id={describedByIds(field.name).error}
			/>
		</Field>
	);
}
