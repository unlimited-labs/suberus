import type * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { useFieldContext } from "@/hooks/form-context";

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
	const hasError =
		field.state.meta.isBlurred && field.state.meta.errors.length > 0;

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
