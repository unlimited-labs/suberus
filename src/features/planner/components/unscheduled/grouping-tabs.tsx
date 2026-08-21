import type { GroupingMode } from "../session-grouper";

const MODES: Array<{ key: GroupingMode; label: string }> = [
	{ key: "intake", label: "Track" },
	{ key: "presenter", label: "Presenter" },
];

interface Props {
	mode: GroupingMode;
	onChange: (mode: GroupingMode) => void;
}

export function GroupingTabs({ mode, onChange }: Props) {
	return (
		<div
			aria-label="Group submissions by"
			className="flex gap-1 border-b px-2 py-1.5"
			data-testid="sidebar-grouping-select"
			role="tablist"
		>
			{MODES.map((m) => (
				<button
					aria-selected={mode === m.key}
					className={`flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
						mode === m.key
							? "bg-muted text-foreground"
							: "text-muted-foreground hover:bg-muted/50"
					}`}
					data-testid={`sidebar-grouping-${m.key}`}
					key={m.key}
					onClick={() => onChange(m.key)}
					role="tab"
					type="button"
				>
					{m.label}
				</button>
			))}
		</div>
	);
}
