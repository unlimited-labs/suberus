import { FieldError } from "@/components/forms/field-error";
import { Label } from "@/components/ui/label";
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
}

export function FormSelectField({
	label,
	options,
	placeholder = "—",
	disabled,
}: FormSelectFieldProps) {
	const field = useFieldContext<string>();

	return (
		<div className="space-y-1">
			<Label htmlFor={field.name}>{label}</Label>
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
			<FieldError errors={field.state.meta.errors} />
		</div>
	);
}
