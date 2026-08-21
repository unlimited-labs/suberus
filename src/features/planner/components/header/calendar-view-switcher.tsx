import type { CalendarView } from "@ilamy/calendar";
import { cn } from "@/shared/lib/utils";

interface Props {
	current: CalendarView;
	onChange: (view: CalendarView) => void;
}

const VIEWS: Array<{ key: CalendarView; label: string }> = [
	{ key: "day", label: "Day" },
	{ key: "week", label: "Week" },
];

export function CalendarViewSwitcher({ current, onChange }: Props) {
	return (
		<div
			aria-label="Calendar view"
			className="flex items-center gap-0.5 rounded-md bg-muted p-1"
			role="tablist"
		>
			{VIEWS.map((v) => {
				const active = current === v.key;
				return (
					<button
						aria-selected={active}
						className={cn(
							"h-7 rounded px-3 text-xs font-medium transition-all",
							active
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
						key={v.key}
						onClick={() => onChange(v.key)}
						role="tab"
						type="button"
					>
						{v.label}
					</button>
				);
			})}
		</div>
	);
}
