import {
	IconCut,
	IconDeviceFloppy,
	IconDotsVertical,
	IconRepeat,
	IconTrash,
} from "@tabler/icons-react";
import { useStore } from "@tanstack/react-store";
import { Button } from "@/shared/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
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
	const isDirty = useStore(form.store, (s) => s.isDirty);
	const isSubmitting = useStore(form.store, (s) => s.isSubmitting);
	const canSplit = presentations.length >= 2 && !session.untimedSlots;

	return (
		<SheetFooter className="flex flex-row items-center gap-2 border-t p-4">
			<Button
				className="flex-1"
				data-testid="session-editor-save"
				disabled={!isDirty || isSubmitting}
				onClick={() => form.handleSubmit()}
				size="sm"
				type="button"
			>
				<IconDeviceFloppy size={14} />
				{isSubmitting ? "Saving…" : "Save"}
			</Button>
			<Button
				data-testid="session-editor-delete"
				disabled={deleting}
				onClick={onDelete}
				size="sm"
				type="button"
				variant="destructive"
			>
				<IconTrash size={14} />
				Delete
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						aria-label="More session actions"
						data-testid="session-editor-more"
						size="icon-sm"
						type="button"
						variant="outline"
					>
						<IconDotsVertical size={14} />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-56">
					<DropdownMenuItem
						data-testid="session-editor-continue-series"
						onClick={mutations.continueSeries}
					>
						<IconRepeat size={13} />
						Continue series
					</DropdownMenuItem>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger
							data-testid="session-editor-split"
							disabled={!canSplit}
						>
							<IconCut size={13} />
							Split after presentation
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="max-h-64 w-72 overflow-y-auto">
							{presentations.slice(0, -1).map((p) => (
								<DropdownMenuItem
									className="text-xs"
									key={p.id}
									onClick={() => mutations.split(p.order)}
								>
									<span className="text-muted-foreground mr-1 font-mono">
										{p.order + 1}.
									</span>
									<span className="line-clamp-1">{p.submissionTitle}</span>
								</DropdownMenuItem>
							))}
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				</DropdownMenuContent>
			</DropdownMenu>
		</SheetFooter>
	);
}
