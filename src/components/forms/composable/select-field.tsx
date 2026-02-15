import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useFieldContext } from "@/hooks/form-context";

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
	placeholder = "\u2014",
	disabled,
	description,
}: FormSelectFieldProps) {
	const field = useFieldContext<string>();
	const hasError =
		field.state.meta.isBlurred && field.state.meta.errors.length > 0;

	return (
		<Field data-invalid={hasError}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
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
			{description && <FieldDescription>{description}</FieldDescription>}
			<FieldError errors={hasError ? field.state.meta.errors : undefined} />
		</Field>
	);
}
