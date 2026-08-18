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
				type="button"
				size="sm"
				disabled={!isDirty || isSubmitting}
				onClick={() => form.handleSubmit()}
				data-testid="session-editor-save"
				className="w-full"
			>
				<IconDeviceFloppy size={14} />
				{isSubmitting ? "Saving…" : "Save"}
			</Button>
			<div className="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={mutations.continueSeries}
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
							disabled={presentations.length < 2 || session.untimedSlots}
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
