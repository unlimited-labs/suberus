import { IconTrash } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import { allRoomsQueryOptions } from "@/utils/rooms.functions";
import { allBreaksQueryOptions } from "@/utils/schedule-breaks.functions";
import { useBreakEditorMutations } from "./break-editor/use-break-editor-mutations";
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
					<BreakEditorBody breakId={breakId} onClose={onClose} />
				)}
			</SheetContent>
		</Sheet>
	);
}

function BreakEditorBody({
	breakId,
	onClose,
}: {
	breakId: string;
	onClose: () => void;
}) {
	const { data: breaks } = useSuspenseQuery(allBreaksQueryOptions());
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const mutations = useBreakEditorMutations(breakId);

	const breakItem = breaks.find((b) => b.id === breakId);

	const [title, setTitle] = useState(breakItem?.title ?? "");
	const [titleDirty, setTitleDirty] = useState(false);
	const [deleting, setDeleting] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset local state when break changes
	useEffect(() => {
		setTitle(breakItem?.title ?? "");
		setTitleDirty(false);
	}, [breakItem?.id]);

	if (!breakItem) {
		return (
			<div className="flex flex-1 items-center justify-center p-8">
				<p className="text-sm text-muted-foreground">Break not found</p>
			</div>
		);
	}

	const handleSaveTitle = async () => {
		if (!titleDirty) return;
		const r = await mutations.updateTitle(title);
		if (r !== null) setTitleDirty(false);
	};

	const handleDelete = async () => {
		setDeleting(true);
		const r = await mutations.deleteBreak();
		if (r !== null) onClose();
		setDeleting(false);
	};

	return (
		<>
			<SheetHeader className="gap-3 border-b p-4">
				<SheetTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					Break editor
				</SheetTitle>
				<Input
					value={title}
					onChange={(e) => {
						setTitle(e.target.value);
						setTitleDirty(true);
					}}
					onBlur={handleSaveTitle}
					onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
					data-testid="break-editor-title"
					className="text-base font-medium"
					placeholder="Break title"
				/>
				<div className="space-y-1">
					<Label className="text-xs text-muted-foreground">
						Room (optional)
					</Label>
					<RoomSelect
						value={breakItem.roomId ?? "none"}
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
					onClick={handleDelete}
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
