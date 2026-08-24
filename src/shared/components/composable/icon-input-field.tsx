import type * as React from "react";
import { FormField } from "@/shared/components/composable/form-field";
import { fieldAria, useFieldError } from "@/shared/hooks/use-field-error";
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
			description={description}
			errors={errors}
			hasError={hasError}
			htmlFor={field.name}
			label={label}
		>
			<IconInput
				{...fieldAria(field.name, hasError, !!description)}
				autoComplete={autoComplete}
				disabled={disabled}
				icon={icon}
				id={field.name}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				placeholder={placeholder}
				type={type}
				value={field.state.value}
			/>
		</FormField>
	);
}
