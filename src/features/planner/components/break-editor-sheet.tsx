import { IconTrash } from "@tabler/icons-react";
import { useStore } from "@tanstack/react-store";
import { useRef } from "react";
import { Button } from "@/shared/ui/button";
import { Field, FieldError } from "@/shared/ui/field";
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
						key={breakId}
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
	const { breakItem, rooms, form, deleting, onDelete } = useBreakEditor();
	const isEvent = breakItem.kind === "EVENT";
	const isDirty = useStore(form.store, (s) => s.isDirty);

	return (
		<form
			noValidate
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void form.handleSubmit();
			}}
			className="flex flex-1 flex-col"
		>
			<SheetHeader className="gap-3 border-b p-4">
				<SheetTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					{isEvent ? "Event editor" : "Break editor"}
				</SheetTitle>
				<form.Field name="title">
					{(field) => (
						<Field data-invalid={field.state.meta.errors.length > 0}>
							<Input
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								data-testid="break-editor-title"
								className="text-base font-medium"
							/>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
				<form.Field name="startLocal">
					{(field) => (
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
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								data-testid="break-editor-start"
								className="h-8 text-sm"
							/>
							<FieldError errors={field.state.meta.errors} />
						</div>
					)}
				</form.Field>
				{isEvent ? (
					<form.Field name="endLocal">
						{(field) => (
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
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									data-testid="break-editor-end"
									className="h-8 text-sm"
								/>
								<FieldError errors={field.state.meta.errors} />
							</div>
						)}
					</form.Field>
				) : (
					<form.Field name="durationMin">
						{(field) => (
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
									value={field.state.value}
									onChange={(e) =>
										field.handleChange(Math.max(1, Number(e.target.value)))
									}
									data-testid="break-editor-duration"
									className="h-8 text-sm"
								/>
							</div>
						)}
					</form.Field>
				)}
				{isEvent ? (
					<>
						<form.Field name="description">
							{(field) => (
								<div className="space-y-1">
									<Label
										htmlFor="break-description"
										className="text-xs text-muted-foreground"
									>
										Description (optional)
									</Label>
									<Textarea
										id="break-description"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										data-testid="break-editor-description"
										rows={3}
										className="text-sm"
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="location">
							{(field) => (
								<div className="space-y-1">
									<Label
										htmlFor="break-location"
										className="text-xs text-muted-foreground"
									>
										Location (optional)
									</Label>
									<Input
										id="break-location"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										data-testid="break-editor-location"
										className="h-8 text-sm"
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="locationUrl">
							{(field) => (
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
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										data-testid="break-editor-location-url"
										className="h-8 text-sm"
									/>
									<FieldError errors={field.state.meta.errors} />
								</div>
							)}
						</form.Field>
					</>
				) : (
					<form.Field name="roomId">
						{(field) => (
							<div className="space-y-1">
								<Label className="text-xs text-muted-foreground">
									Room (optional)
								</Label>
								<RoomSelect
									value={field.state.value}
									onValueChange={(v) => field.handleChange(v)}
									rooms={rooms}
									triggerClassName="h-8 text-sm"
								/>
							</div>
						)}
					</form.Field>
				)}
			</SheetHeader>

			<SheetFooter className="mt-auto flex flex-col gap-2 border-t p-4">
				<form.AppForm>
					<form.SubmitButton
						label="Save"
						submittingLabel="Saving…"
						disabled={!isDirty}
						className="w-full"
						testId="break-editor-save"
					/>
				</form.AppForm>
				<Button
					type="button"
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
		</form>
	);
}
