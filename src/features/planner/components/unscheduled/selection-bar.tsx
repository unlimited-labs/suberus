interface Props {
	count: number;
	onCreateSession: () => void;
	onClear: () => void;
}

export function SelectionBar({ count, onCreateSession, onClear }: Props) {
	return (
		<div
			className="flex items-center gap-2 border-t bg-muted/40 px-2 py-2"
			data-testid="sidebar-selection-bar"
		>
			<span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium">
				{count} selected
			</span>
			<button
				className="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
				data-testid="sidebar-bulk-create-session"
				onClick={onCreateSession}
				type="button"
			>
				+ Create session
			</button>
			<button
				className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
				onClick={onClear}
				type="button"
			>
				Clear
			</button>
		</div>
	);
}
