import type * as React from "react";

import { FormField } from "@/components/forms/composable/form-field";
import { IconInput } from "@/components/forms/icon-input";
import { useFieldError } from "@/hooks/use-field-error";

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
			/>
		</FormField>
	);
}
