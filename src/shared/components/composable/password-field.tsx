import { FormField } from "@/shared/components/composable/form-field";
import { fieldAria, useFieldError } from "@/shared/hooks/use-field-error";
import { PasswordInput } from "@/shared/ui/password-input";

interface FormPasswordFieldProps {
	label: string;
	placeholder?: string;
	disabled?: boolean;
	description?: string;
	autoComplete?: string;
	required?: boolean;
}

export function FormPasswordField({
	label,
	placeholder,
	disabled,
	description,
	autoComplete,
	required,
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
				{...fieldAria(field.name, hasError, !!description)}
				autoComplete={autoComplete}
				disabled={disabled}
				id={field.name}
				name={field.name}
				onBlur={field.handleBlur}
				onChange={field.handleChange}
				placeholder={placeholder}
				required={required}
				value={field.state.value}
			/>
		</FormField>
	);
}
