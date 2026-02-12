import { useStore } from "@tanstack/react-form";

import { FieldError } from "@/components/forms/field-error";
import { PasswordInput } from "@/components/forms/password-input";
import { Label } from "@/components/ui/label";
import { useFieldContext } from "@/hooks/form-context";

interface FormPasswordFieldProps {
	label: string;
	placeholder?: string;
	disabled?: boolean;
}

export function FormPasswordField({
	label,
	placeholder,
	disabled,
}: FormPasswordFieldProps) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (s) => s.meta.errors);
	const hasError = field.state.meta.isTouched && errors.length > 0;

	return (
		<div className="space-y-1">
			<Label htmlFor={field.name}>{label}</Label>
			<PasswordInput
				id={field.name}
				hasError={hasError}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={field.handleChange}
				placeholder={placeholder}
				disabled={disabled}
			/>
			<FieldError errors={errors} />
		</div>
	);
}
