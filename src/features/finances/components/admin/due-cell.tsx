import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";

const LABEL_CLS =
	"text-[10px] font-medium uppercase tracking-wide text-muted-foreground";

export function DueCell({
	value,
	onChange,
	overdue,
	days,
	paid,
	testIdPrefix,
	index,
}: {
	value: string;
	onChange: (value: string) => void;
	overdue: boolean;
	days: number | null;
	paid: boolean;
	testIdPrefix: string;
	index: number;
}) {
	return (
		<div className="ml-auto flex flex-col gap-1">
			<span className={LABEL_CLS}>Due</span>
			<div
				className={cn(
					"flex items-center gap-1.5 text-xs",
					overdue ? "text-destructive" : "text-muted-foreground",
				)}
			>
				<Input
					className={cn(
						"w-40",
						overdue && "border-destructive text-destructive",
					)}
					data-testid={`${testIdPrefix}-due-${index}`}
					onChange={(e) => onChange(e.target.value)}
					type="date"
					value={value}
				/>
				{days === null ? null : overdue ? (
					<span
						className="bg-destructive rounded px-1.5 py-0.5 font-medium text-white"
						data-testid={`${testIdPrefix}-overdue-${index}`}
					>
						{Math.abs(days)}d overdue
					</span>
				) : days === 0 && !paid ? (
					<span className="font-medium text-amber-600">due today</span>
				) : !paid && days > 0 && days <= 7 ? (
					<span>in {days}d</span>
				) : null}
			</div>
		</div>
	);
}
