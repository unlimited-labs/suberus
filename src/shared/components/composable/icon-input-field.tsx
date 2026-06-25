import type * as React from "react";
import { FormField } from "@/shared/components/composable/form-field";
import { useFieldError } from "@/shared/hooks/use-field-error";
import { IconInput } from "@/shared/ui/icon-input";

interface FormIconInputFieldProps {
	label: string;
	icon: React.ReactNode;
	type?: string;
	placeholder?: string;
	disabled?: boolean;
	description?: string;
	autoComplete?: string;
}

export function FormIconInputField({
	label,
	icon,
	type,
	placeholder,
	disabled,
	description,
	autoComplete,
}: FormIconInputFieldProps) {
	const { field, errors, hasError } = useFieldError();

	return (
		<FormField
			label={label}
			htmlFor={field.name}
			hasError={hasError}
			errors={errors}
			description={description}
		>
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
				autoComplete={autoComplete}
			/>
		</FormField>
	);
}
