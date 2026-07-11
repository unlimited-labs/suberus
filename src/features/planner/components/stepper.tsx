import { IconMinus, IconPlus } from "@tabler/icons-react";

interface Props {
	value: number;
	min: number;
	max: number;
	step?: number;
	onChange: (v: number) => void;
}

export function Stepper({ value, min, max, step = 1, onChange }: Props) {
	return (
		<div className="flex h-9 items-center rounded-md border">
			<button
				type="button"
				aria-label="Decrease value"
				className="flex h-full w-9 items-center justify-center border-r text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
				disabled={value <= min}
				onClick={() => onChange(Math.max(min, value - step))}
			>
				<IconMinus size={13} />
			</button>
			<span className="flex-1 text-center text-sm font-medium tabular-nums">
				{value}
			</span>
			<button
				type="button"
				aria-label="Increase value"
				className="flex h-full w-9 items-center justify-center border-l text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
				disabled={value >= max}
				onClick={() => onChange(Math.min(max, value + step))}
			>
				<IconPlus size={13} />
			</button>
		</div>
	);
}
