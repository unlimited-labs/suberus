import { IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	BreakEditorProvider,
	useBreakEditor,
} from "./break-editor/break-editor-context";
import { RoomSelect } from "./shared/room-select";

interface BreakEditorSheetProps {
	breakId: string | null;
	onClose: () => void;
}

export function BreakEditorSheet({ breakId, onClose }: BreakEditorSheetProps) {
	return (
		<Sheet open={breakId !== null} onOpenChange={(open) => !open && onClose()}>
			<SheetContent
				side="right"
				data-testid="break-editor"
				className="flex flex-col gap-0 p-0 sm:max-w-md"
			>
				{breakId !== null && (
					<BreakEditorProvider
						breakId={breakId}
						onClose={onClose}
						fallback={
							<div className="flex flex-1 items-center justify-center p-8">
								<p className="text-sm text-muted-foreground">Break not found</p>
							</div>
						}
					>
						<BreakEditorBody />
					</BreakEditorProvider>
				)}
			</SheetContent>
		</Sheet>
	);
}

function BreakEditorBody() {
	const {
		breakItem,
		rooms,
		title,
		deleting,
		mutations,
		onSaveTitle,
		onDelete,
	} = useBreakEditor();
	return (
		<>
			<SheetHeader className="gap-3 border-b p-4">
				<SheetTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					Break editor
				</SheetTitle>
				<Input
					value={title.value}
					onChange={(e) => title.set(e.target.value)}
					onBlur={onSaveTitle}
					onKeyDown={(e) => e.key === "Enter" && onSaveTitle()}
					data-testid="break-editor-title"
					className="text-base font-medium"
					placeholder="Break title"
				/>
				<div className="space-y-1">
					<Label className="text-xs text-muted-foreground">
						Room (optional)
					</Label>
					<RoomSelect
						value={breakItem.roomId}
						onValueChange={mutations.updateRoom}
						rooms={rooms}
						triggerClassName="h-8 text-sm"
					/>
				</div>
			</SheetHeader>

			<SheetFooter className="mt-auto border-t p-4">
				<Button
					variant="destructive"
					size="sm"
					disabled={deleting}
					onClick={onDelete}
					data-testid="break-editor-delete"
					className="w-full"
				>
					<IconTrash size={14} />
					Delete break
				</Button>
			</SheetFooter>
		</>
	);
}
