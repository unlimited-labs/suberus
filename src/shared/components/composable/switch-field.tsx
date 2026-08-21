import type * as React from "react";
import { useFieldError } from "@/shared/hooks/use-field-error";
import { Field, FieldError, FieldLabel } from "@/shared/ui/field";
import { Switch } from "@/shared/ui/switch";

interface FormSwitchFieldProps {
	label: string | React.ReactNode;
	labelClassName?: string;
	className?: string;
	testId?: string;
}

export function FormSwitchField({
	label,
	labelClassName,
	className,
	testId,
}: FormSwitchFieldProps) {
	const { field, errors, hasError } = useFieldError<boolean>();

	return (
		<Field className={className} orientation="horizontal">
			<Switch
				checked={field.state.value}
				data-testid={testId}
				id={field.name}
				onCheckedChange={(checked) => field.handleChange(checked === true)}
			/>
			<FieldLabel
				className={labelClassName ?? "cursor-pointer text-sm font-normal"}
				htmlFor={field.name}
			>
				{label}
			</FieldLabel>
			<FieldError errors={hasError ? errors : undefined} />
		</Field>
	);
}
