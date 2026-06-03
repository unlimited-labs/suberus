import { useStore } from "@tanstack/react-form";
import type * as React from "react";

import { IconInput } from "@/components/forms/icon-input";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { useFieldContext } from "@/hooks/form-context";

interface FormIconInputFieldProps {
	label: string;
	icon: React.ReactNode;
	type?: string;
	placeholder?: string;
	disabled?: boolean;
	description?: string;
}

export function FormIconInputField({
	label,
	icon,
	type,
	placeholder,
	disabled,
	description,
}: FormIconInputFieldProps) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (s) => s.meta.errors);
	const submissionAttempts = useStore(
		field.form.store,
		(s) => s.submissionAttempts,
	);
	const hasError =
		(field.state.meta.isBlurred || submissionAttempts > 0) && errors.length > 0;

	return (
		<Field data-invalid={hasError}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<IconInput
				id={field.name}
				type={type}
				icon={icon}
				aria-invalid={hasError}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				placeholder={placeholder}
				disabled={disabled}
			/>
			{description && <FieldDescription>{description}</FieldDescription>}
			<FieldError errors={hasError ? errors : undefined} />
		</Field>
	);
}
