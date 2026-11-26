import { FormField } from "@/shared/components/composable/form-field";
import { fieldAria, useFieldError } from "@/shared/hooks/use-field-error";
import { Input } from "@/shared/ui/input";

interface FormInputFieldProps {
	label: string;
	type?: string;
	placeholder?: string;
	disabled?: boolean;
	description?: string;
	testId?: string;
	autoFocus?: boolean;
	autoComplete?: string;
	required?: boolean;
}

export function FormInputField({
	label,
	type,
	placeholder,
	disabled,
	description,
	testId,
	autoFocus,
	autoComplete,
	required,
}: FormInputFieldProps) {
	const { field, errors, hasError } = useFieldError();

	return (
		<FormField
			description={description}
			errors={errors}
			hasError={hasError}
			htmlFor={field.name}
			label={label}
		>
			<Input
				{...fieldAria(field.name, hasError, !!description)}
				autoComplete={autoComplete}
				autoFocus={autoFocus}
				className="h-9"
				data-testid={testId}
				disabled={disabled}
				id={field.name}
				name={field.name}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				placeholder={placeholder}
				required={required}
				type={type}
				value={field.state.value}
			/>
		</FormField>
	);
}
