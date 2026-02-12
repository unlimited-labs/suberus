import { useStore } from "@tanstack/react-form";

import { FieldError } from "@/components/forms/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFieldContext } from "@/hooks/form-context";
import { cn } from "@/lib/utils";

interface FormInputFieldProps {
	label: string;
	type?: string;
	placeholder?: string;
	disabled?: boolean;
}

export function FormInputField({
	label,
	type,
	placeholder,
	disabled,
}: FormInputFieldProps) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (s) => s.meta.errors);
	const hasError = field.state.meta.isTouched && errors.length > 0;

	return (
		<div className="space-y-1">
			<Label htmlFor={field.name}>{label}</Label>
			<Input
				id={field.name}
				type={type}
				className={cn("h-9", hasError && "border-destructive")}
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
