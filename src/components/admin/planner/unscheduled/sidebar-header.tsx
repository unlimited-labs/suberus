import {
	IconBook,
	IconCalendarCheck,
	IconChevronLeft,
	IconLayoutList,
	IconSquareCheck,
} from "@tabler/icons-react";

type ListMode = "unscheduled" | "scheduled";

interface Props {
	mode: ListMode;
	hasItems: boolean;
	selectMode: boolean;
	onToggleMode: () => void;
	onToggleSelectMode: () => void;
	onOpenReader: () => void;
	onCollapse: () => void;
}

export function SidebarHeader({
	mode,
	hasItems,
	selectMode,
	onToggleMode,
	onToggleSelectMode,
	onOpenReader,
	onCollapse,
}: Props) {
	const isScheduled = mode === "scheduled";
	const Icon = isScheduled ? IconCalendarCheck : IconLayoutList;
	const otherLabel = isScheduled ? "Unscheduled" : "Scheduled";
	return (
		<div className="flex items-center justify-between border-b px-3 py-2">
			<button
				type="button"
				onClick={onToggleMode}
				data-testid="sidebar-toggle-mode"
				aria-pressed={isScheduled}
				title={`Switch to ${otherLabel}`}
				className="flex items-center gap-1.5 rounded px-1 py-0.5 text-xs font-medium text-foreground hover:bg-muted"
			>
				<Icon size={14} className="text-muted-foreground" />
				<span>{isScheduled ? "Scheduled" : "Unscheduled"}</span>
			</button>
			<div className="flex items-center gap-1">
				{!isScheduled && hasItems && (
					<>
						<button
							type="button"
							onClick={onToggleSelectMode}
							data-testid="sidebar-toggle-select-mode"
							aria-pressed={selectMode}
							className={`flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium hover:bg-muted ${
								selectMode
									? "bg-primary/10 text-primary hover:bg-primary/15"
									: "text-muted-foreground hover:text-foreground"
							}`}
							title={
								selectMode
									? "Exit selection mode (Esc or S)"
									: "Select submissions (S)"
							}
						>
							<IconSquareCheck size={12} />
							Select
						</button>
						<button
							type="button"
							onClick={onOpenReader}
							data-testid="sidebar-bulk-read"
							className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
							title="Open reading mode"
						>
							<IconBook size={12} />
							Read
						</button>
					</>
				)}
				<button
					type="button"
					onClick={onCollapse}
					className="rounded p-1 text-muted-foreground hover:bg-muted"
					aria-label="Collapse sidebar"
				>
					<IconChevronLeft size={14} />
				</button>
			</div>
		</div>
	);
}
