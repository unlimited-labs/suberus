import { FormField } from "@/shared/components/composable/form-field";
import { useFieldError } from "@/shared/hooks/use-field-error";
import { cn } from "@/shared/lib/utils";
import { Textarea } from "@/shared/ui/textarea";

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
			description={description}
			errors={errors}
			hasError={hasError}
			htmlFor={field.name}
			label={label}
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
				aria-invalid={hasError}
				className={cn("resize-none", className)}
				data-testid={testId}
				disabled={disabled}
				id={field.name}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				placeholder={placeholder}
				rows={rows}
				value={field.state.value}
			/>
		</FormField>
	);
}
