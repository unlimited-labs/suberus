import {
	IconCut,
	IconDeviceFloppy,
	IconRepeat,
	IconTrash,
} from "@tabler/icons-react";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { SheetFooter } from "@/shared/ui/sheet";
import { useSessionEditor } from "./session-editor-context";

export function SessionEditorFooter() {
	const {
		session,
		sortedPresentations: presentations,
		form,
		deleting,
		mutations,
		onDelete,
	} = useSessionEditor();
	const [splitOpen, setSplitOpen] = useState(false);
	const isDirty = useStore(form.store, (s) => s.isDirty);
	const isSubmitting = useStore(form.store, (s) => s.isSubmitting);

	const handleSplit = (order: number) => {
		mutations.split(order);
		setSplitOpen(false);
	};

	return (
		<SheetFooter className="flex flex-col gap-2 border-t p-4">
			<Button
				className="w-full"
				data-testid="session-editor-save"
				disabled={!isDirty || isSubmitting}
				onClick={() => form.handleSubmit()}
				size="sm"
				type="button"
			>
				<IconDeviceFloppy size={14} />
				{isSubmitting ? "Saving…" : "Save"}
			</Button>
			<div className="flex gap-2">
				<Button
					className="flex-1"
					data-testid="session-editor-continue-series"
					onClick={mutations.continueSeries}
					size="sm"
					variant="outline"
				>
					<IconRepeat size={13} />
					Continue series
				</Button>
				<Popover onOpenChange={setSplitOpen} open={splitOpen}>
					<PopoverTrigger asChild>
						<Button
							className="flex-1"
							data-testid="session-editor-split"
							disabled={presentations.length < 2 || session.untimedSlots}
							size="sm"
							variant="outline"
						>
							<IconCut size={13} />
							Split
						</Button>
					</PopoverTrigger>
					<PopoverContent align="end" className="w-72 p-0">
						<div className="border-b p-2 text-xs font-medium">
							Split after presentation:
						</div>
						<div className="max-h-64 overflow-y-auto p-1">
							{presentations.slice(0, -1).map((p) => (
								<button
									className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
									key={p.id}
									onClick={() => handleSplit(p.order)}
									type="button"
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
				className="w-full"
				data-testid="session-editor-delete"
				disabled={deleting}
				onClick={onDelete}
				size="sm"
				variant="destructive"
			>
				<IconTrash size={14} />
				Delete session
			</Button>
		</SheetFooter>
	);
}
