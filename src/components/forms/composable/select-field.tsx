import { FormField } from "@/components/forms/composable/form-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useFieldError } from "@/hooks/use-field-error";

interface SelectOption {
	value: string;
	label: string;
}

interface FormSelectFieldProps {
	label: string;
	options: readonly SelectOption[];
	placeholder?: string;
	disabled?: boolean;
	description?: string;
}

export function FormSelectField({
	label,
	options,
	placeholder = "—",
	disabled,
	description,
}: FormSelectFieldProps) {
	const { field, errors, hasError } = useFieldError();

	return (
		<FormField
			label={label}
			htmlFor={field.name}
			hasError={hasError}
			errors={errors}
			description={description}
		>
			<Select
				value={field.state.value || ""}
				onValueChange={(value) => field.handleChange(value)}
				disabled={disabled}
			>
				<SelectTrigger className="h-9">
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</FormField>
	);
}
