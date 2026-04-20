import { IconCut, IconRepeat, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { SheetFooter } from "@/components/ui/sheet";

interface SplitCandidate {
	id: string;
	order: number;
	submissionTitle: string;
}

interface Props {
	presentations: SplitCandidate[];
	deleting: boolean;
	onContinueSeries: () => void;
	onSplit: (afterSlotOrder: number) => void;
	onDelete: () => void;
}

export function SessionEditorFooter({
	presentations,
	deleting,
	onContinueSeries,
	onSplit,
	onDelete,
}: Props) {
	const [splitOpen, setSplitOpen] = useState(false);

	const handleSplit = (order: number) => {
		onSplit(order);
		setSplitOpen(false);
	};

	return (
		<SheetFooter className="flex flex-col gap-2 border-t p-4">
			<div className="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={onContinueSeries}
					data-testid="session-editor-continue-series"
					className="flex-1"
				>
					<IconRepeat size={13} />
					Continue series
				</Button>
				<Popover open={splitOpen} onOpenChange={setSplitOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							disabled={presentations.length < 2}
							data-testid="session-editor-split"
							className="flex-1"
						>
							<IconCut size={13} />
							Split
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-72 p-0" align="end">
						<div className="border-b p-2 text-xs font-medium">
							Split after presentation:
						</div>
						<div className="max-h-64 overflow-y-auto p-1">
							{presentations.slice(0, -1).map((p) => (
								<button
									key={p.id}
									type="button"
									onClick={() => handleSplit(p.order)}
									className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
								>
									<span className="mr-2 font-mono text-muted-foreground">
										{p.order + 1}.
									</span>
									<span className="line-clamp-1">{p.submissionTitle}</span>
								</button>
							))}
						</div>
					</PopoverContent>
				</Popover>
			</div>
			<Button
				variant="destructive"
				size="sm"
				disabled={deleting}
				onClick={onDelete}
				data-testid="session-editor-delete"
				className="w-full"
			>
				<IconTrash size={14} />
				Delete session
			</Button>
		</SheetFooter>
	);
}
