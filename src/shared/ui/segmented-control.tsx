import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { cn } from "@/shared/lib/utils";
import { buttonVariants } from "@/shared/ui/button";

interface SegmentedControlProps<T extends string> {
	labelledBy: string;
	value: T;
	options: ReadonlyArray<{ value: T; label: string; disabled?: boolean }>;
	onChange: (value: T) => void;
	describedBy?: string;
	testId?: string;
}

export function SegmentedControl<T extends string>({
	labelledBy,
	value,
	options,
	onChange,
	describedBy,
	testId,
}: SegmentedControlProps<T>) {
	return (
		<RadioGroup<T>
			aria-describedby={describedBy}
			aria-labelledby={labelledBy}
			className="bg-muted inline-flex flex-wrap gap-0.5 rounded-lg p-0.5"
			data-testid={testId}
			onValueChange={onChange}
			value={value}
		>
			{options.map((o) => (
				<Radio.Root
					className={cn(
						buttonVariants({ size: "sm", variant: "ghost" }),
						"text-muted-foreground data-checked:border-border data-checked:bg-background data-checked:text-foreground cursor-pointer border border-transparent data-disabled:cursor-not-allowed data-disabled:opacity-50",
					)}
					disabled={o.disabled}
					key={o.value}
					value={o.value}
				>
					{o.label}
				</Radio.Root>
			))}
		</RadioGroup>
	);
}
