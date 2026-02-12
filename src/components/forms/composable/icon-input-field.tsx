import { useStore } from "@tanstack/react-form";
import type * as React from "react";

import { FieldError } from "@/components/forms/field-error";
import { IconInput } from "@/components/forms/icon-input";
import { Label } from "@/components/ui/label";
import { useFieldContext } from "@/hooks/form-context";

interface FormIconInputFieldProps {
	label: string;
	icon: React.ReactNode;
	type?: string;
	placeholder?: string;
	disabled?: boolean;
}

export function FormIconInputField({
	label,
	icon,
	type,
	placeholder,
	disabled,
}: FormIconInputFieldProps) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (s) => s.meta.errors);
	const hasError = field.state.meta.isTouched && errors.length > 0;

	return (
		<div className="space-y-1">
			<Label htmlFor={field.name}>{label}</Label>
			<IconInput
				id={field.name}
				type={type}
				icon={icon}
				hasError={hasError}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				placeholder={placeholder}
				disabled={disabled}
			/>
			<FieldError errors={errors} />
		</div>
	);
}
