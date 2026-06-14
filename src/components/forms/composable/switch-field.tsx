import { useStore } from "@tanstack/react-form";
import type * as React from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useFieldContext } from "@/shared/hooks/form-context";

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
	const submissionAttempts = useStore(
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
