import { useStore } from "@tanstack/react-form";

import { CountryCombobox } from "@/components/ui/country-combobox";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { useFieldContext } from "@/hooks/form-context";

interface FormCountryComboboxFieldProps {
	label: string;
	disabled?: boolean;
	description?: string;
}

export function FormCountryComboboxField({
	label,
	disabled,
	description,
}: FormCountryComboboxFieldProps) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (s) => s.meta.errors);
	const submissionAttempts = useStore(
		field.form.store,
		(s) => s.submissionAttempts,
	);
	const hasError =
		(field.state.meta.isBlurred || submissionAttempts > 0) && errors.length > 0;

	return (
		<Field data-invalid={hasError}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<CountryCombobox
				value={field.state.value || ""}
				onChange={field.handleChange}
				disabled={disabled}
			/>
			{description && <FieldDescription>{description}</FieldDescription>}
			<FieldError errors={hasError ? errors : undefined} />
		</Field>
	);
}
