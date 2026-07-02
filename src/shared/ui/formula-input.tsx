import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";

export interface FormulaInputProps
	extends Omit<ComponentProps<"input">, "value" | "onChange"> {
	value: string;
	onValueChange: (value: string) => void;
	evaluate: (expr: string) => number;
	format?: (value: number) => string;
	resultTestId?: string;
	wrapperClassName?: string;
	resultClassName?: string;
}

export function FormulaInput({
	value,
	onValueChange,
	evaluate,
	format = String,
	className,
	resultTestId,
	wrapperClassName,
	resultClassName,
	...props
}: FormulaInputProps) {
	const hasValue = value.trim() !== "";
	return (
		<div className={cn("flex items-center gap-1", wrapperClassName)}>
			<Input
				type="text"
				value={value}
				onChange={(e) => onValueChange(e.target.value)}
				className={className}
				{...props}
			/>
			<span
				className={cn(
					"w-24 text-right text-xs tabular-nums text-muted-foreground",
					resultClassName,
				)}
				data-testid={resultTestId}
			>
				{hasValue ? `= ${format(evaluate(value))}` : ""}
			</span>
		</div>
	);
}
