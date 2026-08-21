import { FormField } from "@/shared/components/composable/form-field";
import { useFieldError } from "@/shared/hooks/use-field-error";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

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
			description={description}
			errors={errors}
			hasError={hasError}
			htmlFor={field.name}
			label={label}
		>
			<Select
				disabled={disabled}
				items={options}
				onValueChange={(value) => field.handleChange(value)}
				value={field.state.value || ""}
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
