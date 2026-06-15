import { useSelector } from "@tanstack/react-store";
import type * as React from "react";
import { useFieldContext } from "@/shared/hooks/form-context";
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
			<Switch
				id={field.name}
				checked={field.state.value}
				onCheckedChange={(checked) => field.handleChange(checked === true)}
				data-testid={testId}
			/>
			<FieldLabel
				htmlFor={field.name}
				className={labelClassName ?? "cursor-pointer text-sm font-normal"}
			>
				{label}
			</FieldLabel>
			<FieldError errors={hasError ? field.state.meta.errors : undefined} />
		</Field>
	);
}
