import { FormField } from "@/components/forms/composable/form-field";
import { Textarea } from "@/components/ui/textarea";
import { useFieldError } from "@/hooks/use-field-error";
import { cn } from "@/shared/lib/utils";

interface FormTextareaFieldProps {
	label: string;
	placeholder?: string;
	rows?: number;
	disabled?: boolean;
	className?: string;
	charCount?: { min?: number };
	description?: string;
	testId?: string;
}

export function FormTextareaField({
	label,
	placeholder,
	rows,
	disabled,
	className,
	charCount,
	description,
	testId,
}: FormTextareaFieldProps) {
	const { field, errors, hasError } = useFieldError();
	const length = field.state.value.length;

	return (
		<FormField
			label={label}
			htmlFor={field.name}
			hasError={hasError}
			errors={errors}
			description={description}
			labelAddon={
				charCount && (
					<span
						className={cn(
							"text-xs",
							charCount.min && length < charCount.min
								? "text-destructive"
								: "text-muted-foreground",
						)}
					>
						{length} characters
						{charCount.min &&
							length < charCount.min &&
							` (min. ${charCount.min} required)`}
					</span>
				)
			}
		>
			<Textarea
				id={field.name}
				value={field.state.value}
				onChange={(e) => field.handleChange(e.target.value)}
				onBlur={field.handleBlur}
				rows={rows}
				placeholder={placeholder}
				disabled={disabled}
				aria-invalid={hasError}
				className={cn("resize-none", className)}
				data-testid={testId}
			/>
		</FormField>
	);
}
