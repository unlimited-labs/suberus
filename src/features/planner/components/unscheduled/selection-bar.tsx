interface Props {
	count: number;
	onCreateSession: () => void;
	onClear: () => void;
}

export function SelectionBar({ count, onCreateSession, onClear }: Props) {
	return (
		<div
			className="bg-muted/40 flex items-center gap-2 border-t p-2"
			data-testid="sidebar-selection-bar"
		>
			<span className="bg-background rounded-full px-2 py-0.5 text-[11px] font-medium">
				{count} selected
			</span>
			<button
				className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-2 py-1 text-[11px] font-medium"
				data-testid="sidebar-bulk-create-session"
				onClick={onCreateSession}
				type="button"
			>
				+ Create session
			</button>
			<button
				className="text-muted-foreground hover:text-foreground ml-auto text-[11px]"
				onClick={onClear}
				type="button"
			>
				Clear
			</button>
		</div>
	);
}
