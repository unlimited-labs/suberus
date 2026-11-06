import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

interface SegmentedControlProps<T extends string> {
	label: string;
	value: T;
	options: ReadonlyArray<{ value: T; label: string }>;
	onChange: (value: T) => void;
	disabled?: boolean;
	testId?: string;
}

export function SegmentedControl<T extends string>({
	label,
	value,
	options,
	onChange,
	disabled,
	testId,
}: SegmentedControlProps<T>) {
	return (
		<div
			aria-label={label}
			className="bg-muted inline-flex flex-wrap gap-0.5 rounded-lg p-0.5"
			data-testid={testId}
			role="radiogroup"
		>
			{options.map((o) => (
				<Button
					aria-checked={value === o.value}
					className={cn(value !== o.value && "text-muted-foreground")}
					disabled={disabled}
					key={o.value}
					onClick={() => onChange(o.value)}
					role="radio"
					size="sm"
					type="button"
					variant={value === o.value ? "outline" : "ghost"}
				>
					{o.label}
				</Button>
			))}
		</div>
	);
}
