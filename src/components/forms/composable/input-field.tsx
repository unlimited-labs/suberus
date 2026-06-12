import { FormField } from "@/components/forms/composable/form-field";
import { Input } from "@/components/ui/input";
import { useFieldError } from "@/hooks/use-field-error";

interface FormInputFieldProps {
	label: string;
	type?: string;
	placeholder?: string;
	disabled?: boolean;
	description?: string;
	testId?: string;
}

export function FormInputField({
	label,
	type,
	placeholder,
	disabled,
	description,
	testId,
}: FormInputFieldProps) {
	const { field, errors, hasError } = useFieldError();

	return (
		<FormField
			label={label}
			htmlFor={field.name}
			hasError={hasError}
			errors={errors}
			description={description}
		>
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
				data-testid={testId}
			/>
		</FormField>
	);
}
