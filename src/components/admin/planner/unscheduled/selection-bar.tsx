interface Props {
	count: number;
	onCreateSession: () => void;
	onClear: () => void;
}

export function SelectionBar({ count, onCreateSession, onClear }: Props) {
	return (
		<div
			data-testid="sidebar-selection-bar"
			className="flex items-center gap-2 border-t bg-muted/40 px-2 py-2"
		>
			<span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium">
				{count} selected
			</span>
			<button
				type="button"
				onClick={onCreateSession}
				data-testid="sidebar-bulk-create-session"
				className="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
			>
				+ Create session
			</button>
			<button
				type="button"
				onClick={onClear}
				className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
			>
				Clear
			</button>
		</div>
	);
}
