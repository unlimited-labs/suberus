import { useStore } from "@tanstack/react-form";

import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useFieldContext } from "@/hooks/form-context";
import { cn } from "@/lib/utils";

interface FormTextareaFieldProps {
	label: string;
	placeholder?: string;
	rows?: number;
	disabled?: boolean;
	className?: string;
	charCount?: { min?: number };
	description?: string;
}

export function FormTextareaField({
	label,
	placeholder,
	rows,
	disabled,
	className,
	charCount,
	description,
}: FormTextareaFieldProps) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (s) => s.meta.errors);
	const submissionAttempts = useStore(
		field.form.store,
		(s) => s.submissionAttempts,
	);
	const hasError =
		(field.state.meta.isBlurred || submissionAttempts > 0) && errors.length > 0;
	const length = field.state.value.length;

	return (
		<Field data-invalid={hasError}>
			<div className="flex items-center justify-between">
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{charCount && (
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
				)}
			</div>
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
			/>
			{description && <FieldDescription>{description}</FieldDescription>}
			<FieldError errors={hasError ? errors : undefined} />
		</Field>
	);
}
