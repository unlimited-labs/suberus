import { FormField } from "@/shared/components/composable/form-field";
import { useFieldError } from "@/shared/hooks/use-field-error";
import { CountryCombobox } from "@/shared/ui/country-combobox";

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
			description={description}
			errors={errors}
			hasError={hasError}
			htmlFor={field.name}
			label={label}
		>
			<CountryCombobox
				disabled={disabled}
				onChange={field.handleChange}
				value={field.state.value || ""}
			/>
		</FormField>
	);
}
