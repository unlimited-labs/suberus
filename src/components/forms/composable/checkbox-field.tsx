import type * as React from "react";

import { FieldError } from "@/components/forms/field-error";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useFieldContext } from "@/hooks/form-context";

interface FormCheckboxFieldProps {
	label: string | React.ReactNode;
	labelClassName?: string;
	className?: string;
}

export function FormCheckboxField({
	label,
	labelClassName,
	className,
}: FormCheckboxFieldProps) {
	const field = useFieldContext<boolean>();

	return (
		<div className={className}>
			<div className="flex items-center gap-2">
				<Checkbox
					id={field.name}
					checked={field.state.value}
					onCheckedChange={(checked) => field.handleChange(checked === true)}
				/>
				<Label
					htmlFor={field.name}
					className={
						labelClassName ??
						"cursor-pointer text-sm font-normal text-muted-foreground"
					}
				>
					{label}
				</Label>
			</div>
			<FieldError errors={field.state.meta.errors} />
		</div>
	);
}
