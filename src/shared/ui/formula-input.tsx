import { IconCoins, IconMathFunction } from "@tabler/icons-react";
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

const isFormula = (value: string) =>
	/[+*/^%()]/.test(value) || /\d\s*-/.test(value);

const sanitizeMath = (raw: string) =>
	raw.replace(/,/g, ".").replace(/[^0-9+\-*/().%^\s]/g, "");

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
	const formula = isFormula(value);
	const Icon = formula ? IconMathFunction : IconCoins;
	return (
		<InputGroup className={cn("w-44", className)}>
			<InputGroupAddon>
				<Icon
					className={cn(
						"size-3.5",
						formula ? "text-primary" : "text-muted-foreground",
					)}
				/>
			</InputGroupAddon>
			<InputGroupInput
				type="text"
				inputMode="decimal"
				value={value}
				onChange={(e) => onValueChange(sanitizeMath(e.target.value))}
				className={cn("text-right tabular-nums", inputClassName)}
				{...props}
			/>
			{showResult && formula ? (
				<InputGroupAddon align="inline-end">
					<span
						className="text-xs tabular-nums text-muted-foreground"
						data-testid={resultTestId}
					>
						= {format(evaluate(value))}
					</span>
				</InputGroupAddon>
			) : null}
		</InputGroup>
	);
}
