import { FormField } from "@/components/forms/composable/form-field";
import { CountryCombobox } from "@/components/ui/country-combobox";
import { useFieldError } from "@/shared/hooks/use-field-error";

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
	const { field, errors, hasError } = useFieldError();

	return (
		<FormField
			label={label}
			htmlFor={field.name}
			hasError={hasError}
			errors={errors}
			description={description}
		>
			<CountryCombobox
				value={field.state.value || ""}
				onChange={field.handleChange}
				disabled={disabled}
			/>
		</FormField>
	);
}
