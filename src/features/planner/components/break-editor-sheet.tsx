import { IconDeviceFloppy, IconTrash } from "@tabler/icons-react";
import { useRef } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/shared/ui/sheet";
import { Textarea } from "@/shared/ui/textarea";
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
	const dirtyRef = useRef(false);
	const requestClose = () => {
		if (dirtyRef.current && !window.confirm("Discard unsaved changes?")) return;
		onClose();
	};
	return (
		<Sheet
			open={breakId !== null}
			onOpenChange={(open) => !open && requestClose()}
		>
			<SheetContent
				side="right"
				data-testid="break-editor"
				className="flex flex-col gap-0 p-0 sm:max-w-md"
			>
				<SheetDescription className="sr-only">
					Edit the schedule item's details.
				</SheetDescription>
				{breakId !== null && (
					<BreakEditorProvider
						breakId={breakId}
						onClose={onClose}
						dirtyRef={dirtyRef}
						fallback={
							<div className="flex flex-1 items-center justify-center p-8">
								<p className="text-sm text-muted-foreground">Item not found</p>
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
	const { breakItem, rooms, draft, saving, deleting, onSave, onDelete } =
		useBreakEditor();
	const isEvent = breakItem.kind === "EVENT";
	const {
		title,
		startLocal,
		endLocal,
		durationMin,
		description,
		location,
		locationUrl,
		roomId,
	} = draft.values;
	return (
		<>
			<SheetHeader className="gap-3 border-b p-4">
				<SheetTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					{isEvent ? "Event editor" : "Break editor"}
				</SheetTitle>
				<Input
					value={title}
					onChange={(e) => draft.set("title", e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && onSave()}
					data-testid="break-editor-title"
					className="text-base font-medium"
				/>
				<div className="space-y-1">
					<Label
						htmlFor="break-start"
						className="text-xs text-muted-foreground"
					>
						Start
					</Label>
					<Input
						id="break-start"
						type="datetime-local"
						value={startLocal}
						onChange={(e) => draft.set("startLocal", e.target.value)}
						data-testid="break-editor-start"
						className="h-8 text-sm"
					/>
				</div>
				{isEvent ? (
					<div className="space-y-1">
						<Label
							htmlFor="break-end"
							className="text-xs text-muted-foreground"
						>
							End
						</Label>
						<Input
							id="break-end"
							type="datetime-local"
							value={endLocal}
							onChange={(e) => draft.set("endLocal", e.target.value)}
							data-testid="break-editor-end"
							className="h-8 text-sm"
						/>
					</div>
				) : (
					<div className="space-y-1">
						<Label
							htmlFor="break-duration"
							className="text-xs text-muted-foreground"
						>
							Duration (min)
						</Label>
						<Input
							id="break-duration"
							type="number"
							min={1}
							step={5}
							value={durationMin}
							onChange={(e) =>
								draft.set("durationMin", Math.max(1, Number(e.target.value)))
							}
							data-testid="break-editor-duration"
							className="h-8 text-sm"
						/>
					</div>
				)}
				{isEvent ? (
					<>
						<div className="space-y-1">
							<Label
								htmlFor="break-description"
								className="text-xs text-muted-foreground"
							>
								Description (optional)
							</Label>
							<Textarea
								id="break-description"
								value={description}
								onChange={(e) => draft.set("description", e.target.value)}
								data-testid="break-editor-description"
								rows={3}
								className="text-sm"
							/>
						</div>
						<div className="space-y-1">
							<Label
								htmlFor="break-location"
								className="text-xs text-muted-foreground"
							>
								Location (optional)
							</Label>
							<Input
								id="break-location"
								value={location}
								onChange={(e) => draft.set("location", e.target.value)}
								data-testid="break-editor-location"
								className="h-8 text-sm"
							/>
						</div>
						<div className="space-y-1">
							<Label
								htmlFor="break-location-url"
								className="text-xs text-muted-foreground"
							>
								Link (optional)
							</Label>
							<Input
								id="break-location-url"
								type="url"
								value={locationUrl}
								onChange={(e) => draft.set("locationUrl", e.target.value)}
								data-testid="break-editor-location-url"
								className="h-8 text-sm"
							/>
						</div>
					</>
				) : (
					<div className="space-y-1">
						<Label className="text-xs text-muted-foreground">
							Room (optional)
						</Label>
						<RoomSelect
							value={roomId}
							onValueChange={(v) => draft.set("roomId", v)}
							rooms={rooms}
							triggerClassName="h-8 text-sm"
						/>
					</div>
				)}
			</SheetHeader>

			<SheetFooter className="mt-auto flex flex-col gap-2 border-t p-4">
				<Button
					size="sm"
					disabled={!draft.dirty || saving}
					onClick={onSave}
					data-testid="break-editor-save"
					className="w-full"
				>
					<IconDeviceFloppy size={14} />
					Save
				</Button>
				<Button
					variant="destructive"
					size="sm"
					disabled={deleting}
					onClick={onDelete}
					data-testid="break-editor-delete"
					className="w-full"
				>
					<IconTrash size={14} />
					{isEvent ? "Delete event" : "Delete break"}
				</Button>
			</SheetFooter>
		</>
	);
}
