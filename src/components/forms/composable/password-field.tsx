import { FormField } from "@/components/forms/composable/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { useFieldError } from "@/shared/hooks/use-field-error";

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
	const { field, errors, hasError } = useFieldError();

	return (
		<FormField
			label={label}
			htmlFor={field.name}
			hasError={hasError}
			errors={errors}
			description={description}
		>
			<PasswordInput
				id={field.name}
				aria-invalid={hasError}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={field.handleChange}
				placeholder={placeholder}
				disabled={disabled}
			/>
		</FormField>
	);
}
