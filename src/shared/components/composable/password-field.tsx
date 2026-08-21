import { FormField } from "@/shared/components/composable/form-field";
import { useFieldError } from "@/shared/hooks/use-field-error";
import { PasswordInput } from "@/shared/ui/password-input";

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
			description={description}
			errors={errors}
			hasError={hasError}
			htmlFor={field.name}
			label={label}
		>
			<PasswordInput
				aria-invalid={hasError}
				disabled={disabled}
				id={field.name}
				onBlur={field.handleBlur}
				onChange={field.handleChange}
				placeholder={placeholder}
				value={field.state.value}
			/>
		</FormField>
	);
}
