import { useStore } from "@tanstack/react-form";

import { PasswordInput } from "@/components/forms/password-input";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { useFieldContext } from "@/hooks/form-context";

interface FormPasswordFieldProps {
	label: string;
	placeholder?: string;
	disabled?: boolean;
	description?: string;
}

export function FormPasswordField({
	label,
	placeholder,
	disabled,
	description,
}: FormPasswordFieldProps) {
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
			<PasswordInput
				id={field.name}
				aria-invalid={hasError}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={field.handleChange}
				placeholder={placeholder}
				disabled={disabled}
			/>
			{description && <FieldDescription>{description}</FieldDescription>}
			<FieldError errors={hasError ? errors : undefined} />
		</Field>
	);
}
