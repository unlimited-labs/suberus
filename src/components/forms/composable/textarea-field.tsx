import { useStore } from "@tanstack/react-form";

import { FieldError } from "@/components/forms/field-error";
import { Label } from "@/components/ui/label";
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
}

export function FormTextareaField({
	label,
	placeholder,
	rows,
	disabled,
	className,
	charCount,
}: FormTextareaFieldProps) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (s) => s.meta.errors);
	const hasError = field.state.meta.isTouched && errors.length > 0;
	const length = field.state.value.length;

	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between">
				<Label htmlFor={field.name}>{label}</Label>
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
				className={cn(
					"resize-none",
					hasError && "border-destructive",
					className,
				)}
			/>
			<FieldError errors={errors} />
		</div>
	);
}
