import { IconMathFunction } from "@tabler/icons-react";
import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/utils";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/shared/ui/input-group";

export interface FormulaInputProps
	extends Omit<ComponentProps<"input">, "value" | "onChange"> {
	value: string;
	onValueChange: (value: string) => void;
	evaluate: (expr: string) => number;
	format?: (value: number) => string;
	showResult?: boolean;
	resultTestId?: string;
	inputClassName?: string;
}

export function FormulaInput({
	value,
	onValueChange,
	evaluate,
	format = String,
	showResult = true,
	className,
	inputClassName,
	resultTestId,
	...props
}: FormulaInputProps) {
	const hasValue = value.trim() !== "";
	return (
		<InputGroup className={cn("w-44", className)}>
			<InputGroupAddon>
				<IconMathFunction className="size-3.5" />
			</InputGroupAddon>
			<InputGroupInput
				type="text"
				value={value}
				onChange={(e) => onValueChange(e.target.value)}
				className={cn("text-right tabular-nums", inputClassName)}
				{...props}
			/>
			{showResult ? (
				<InputGroupAddon align="inline-end">
					<span
						className="text-xs tabular-nums text-muted-foreground"
						data-testid={resultTestId}
					>
						{hasValue ? `= ${format(evaluate(value))}` : ""}
					</span>
				</InputGroupAddon>
			) : null}
		</InputGroup>
	);
}
