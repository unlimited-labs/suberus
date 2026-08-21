import { IconChevronRight, IconLayoutList } from "@tabler/icons-react";

interface Props {
	count: number;
	onExpand: () => void;
}

export function SidebarCollapsed({ count, onExpand }: Props) {
	return (
		<div className="bg-muted/30 flex flex-col items-center border-r pt-3">
			<button
				aria-label={`Open unscheduled submissions panel (${count})`}
				className="text-muted-foreground hover:bg-muted hover:text-foreground flex flex-col items-center gap-1 rounded px-2 py-2"
				onClick={onExpand}
				title="Unscheduled submissions"
				type="button"
			>
				<IconLayoutList size={16} />
				<span className="text-[10px] font-medium tracking-wide uppercase [writing-mode:vertical-rl]">
					Unscheduled ({count})
				</span>
			</button>
			<button
				aria-label="Expand unscheduled submissions panel"
				className="text-muted-foreground hover:bg-muted mt-2 rounded p-1"
				onClick={onExpand}
				type="button"
			>
				<IconChevronRight size={14} />
			</button>
		</div>
	);
}
