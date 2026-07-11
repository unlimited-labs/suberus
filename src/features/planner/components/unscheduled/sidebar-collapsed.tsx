import { IconChevronRight, IconLayoutList } from "@tabler/icons-react";

interface Props {
	count: number;
	onExpand: () => void;
}

export function SidebarCollapsed({ count, onExpand }: Props) {
	return (
		<div className="flex flex-col items-center border-r bg-muted/30 pt-3">
			<button
				type="button"
				onClick={onExpand}
				className="flex flex-col items-center gap-1 rounded px-2 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
				title="Unscheduled submissions"
				aria-label={`Open unscheduled submissions panel (${count})`}
			>
				<IconLayoutList size={16} />
				<span className="text-[10px] font-medium uppercase tracking-wide [writing-mode:vertical-rl]">
					Unscheduled ({count})
				</span>
			</button>
			<button
				type="button"
				onClick={onExpand}
				aria-label="Expand unscheduled submissions panel"
				className="mt-2 rounded p-1 text-muted-foreground hover:bg-muted"
			>
				<IconChevronRight size={14} />
			</button>
		</div>
	);
}
