import { useStore } from "@tanstack/react-form";

import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFieldContext } from "@/hooks/form-context";

interface FormInputFieldProps {
	label: string;
	type?: string;
	placeholder?: string;
	disabled?: boolean;
	description?: string;
}

export function FormInputField({
	label,
	type,
	placeholder,
	disabled,
	description,
}: FormInputFieldProps) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (s) => s.meta.errors);
	const hasError = field.state.meta.isBlurred && errors.length > 0;

	return (
		<Field data-invalid={hasError}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Input
				id={field.name}
				type={type}
				className="h-9"
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
