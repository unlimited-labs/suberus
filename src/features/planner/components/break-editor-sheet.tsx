import { IconTrash } from "@tabler/icons-react";
import { useStore } from "@tanstack/react-store";
import { useRef } from "react";
import { Form } from "@/shared/components/composable/form";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
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
			onOpenChange={(open) => !open && requestClose()}
			open={breakId !== null}
		>
			<SheetContent
				className="flex flex-col gap-0 p-0 sm:max-w-md"
				data-testid="break-editor"
				side="right"
			>
				<SheetDescription className="sr-only">
					Edit the schedule item's details.
				</SheetDescription>
				{breakId !== null && (
					<BreakEditorProvider
						breakId={breakId}
						dirtyRef={dirtyRef}
						fallback={
							<div className="flex flex-1 items-center justify-center p-8">
								<p className="text-muted-foreground text-sm">Item not found</p>
							</div>
						}
						key={breakId}
						onClose={onClose}
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
	const submissionAttempts = useStore(form.store, (s) => s.submissionAttempts);

	return (
		<Form
			className="flex flex-1 flex-col"
			onSubmit={() => {
				void form.handleSubmit();
			}}
		>
			<SheetHeader className="gap-3 border-b p-4">
				<SheetTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
					{isEvent ? "Event editor" : "Break editor"}
				</SheetTitle>
				<form.Field name="title">
					{(field) => (
						<Field
							data-invalid={isFieldErrorVisible(
								field.state.meta,
								submissionAttempts,
							)}
						>
							<Input
								className="text-base font-medium"
								data-testid="break-editor-title"
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								value={field.state.value}
							/>
							<FieldError
								errors={
									isFieldErrorVisible(field.state.meta, submissionAttempts)
										? field.state.meta.errors
										: undefined
								}
							/>
						</Field>
					)}
				</form.Field>
				<form.Field name="startLocal">
					{(field) => (
						<div className="space-y-1">
							<Label
								className="text-muted-foreground text-xs"
								htmlFor="break-start"
							>
								Start
							</Label>
							<Input
								className="h-8 text-sm"
								data-testid="break-editor-start"
								id="break-start"
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								type="datetime-local"
								value={field.state.value}
							/>
							<FieldError
								errors={
									isFieldErrorVisible(field.state.meta, submissionAttempts)
										? field.state.meta.errors
										: undefined
								}
							/>
						</div>
					)}
				</form.Field>
				{isEvent ? (
					<form.Field name="endLocal">
						{(field) => (
							<div className="space-y-1">
								<Label
									className="text-muted-foreground text-xs"
									htmlFor="break-end"
								>
									End
								</Label>
								<Input
									className="h-8 text-sm"
									data-testid="break-editor-end"
									id="break-end"
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									type="datetime-local"
									value={field.state.value}
								/>
								<FieldError
									errors={
										isFieldErrorVisible(field.state.meta, submissionAttempts)
											? field.state.meta.errors
											: undefined
									}
								/>
							</div>
						)}
					</form.Field>
				) : (
					<form.Field name="durationMin">
						{(field) => (
							<div className="space-y-1">
								<Label
									className="text-muted-foreground text-xs"
									htmlFor="break-duration"
								>
									Duration (min)
								</Label>
								<Input
									className="h-8 text-sm"
									data-testid="break-editor-duration"
									id="break-duration"
									min={1}
									onChange={(e) =>
										field.handleChange(Math.max(1, Number(e.target.value)))
									}
									step={5}
									type="number"
									value={field.state.value}
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
										className="text-muted-foreground text-xs"
										htmlFor="break-description"
									>
										Description (optional)
									</Label>
									<Textarea
										className="text-sm"
										data-testid="break-editor-description"
										id="break-description"
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										rows={3}
										value={field.state.value}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="location">
							{(field) => (
								<div className="space-y-1">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="break-location"
									>
										Location (optional)
									</Label>
									<Input
										className="h-8 text-sm"
										data-testid="break-editor-location"
										id="break-location"
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										value={field.state.value}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="locationUrl">
							{(field) => (
								<div className="space-y-1">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="break-location-url"
									>
										Link (optional)
									</Label>
									<Input
										className="h-8 text-sm"
										data-testid="break-editor-location-url"
										id="break-location-url"
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										type="url"
										value={field.state.value}
									/>
									<FieldError
										errors={
											isFieldErrorVisible(field.state.meta, submissionAttempts)
												? field.state.meta.errors
												: undefined
										}
									/>
								</div>
							)}
						</form.Field>
					</>
				) : (
					<form.Field name="roomId">
						{(field) => (
							<div className="space-y-1">
								<Label className="text-muted-foreground text-xs">
									Room (optional)
								</Label>
								<RoomSelect
									onValueChange={(v) => field.handleChange(v)}
									rooms={rooms}
									triggerClassName="h-8 text-sm"
									value={field.state.value}
								/>
							</div>
						)}
					</form.Field>
				)}
			</SheetHeader>

			<SheetFooter className="mt-auto flex flex-col gap-2 border-t p-4">
				<form.AppForm>
					<form.SubmitButton
						className="w-full"
						disabled={!isDirty}
						label="Save"
						submittingLabel="Saving…"
						testId="break-editor-save"
					/>
				</form.AppForm>
				<Button
					className="w-full"
					data-testid="break-editor-delete"
					disabled={deleting}
					onClick={onDelete}
					size="sm"
					type="button"
					variant="destructive"
				>
					<IconTrash size={14} />
					{isEvent ? "Delete event" : "Delete break"}
				</Button>
			</SheetFooter>
		</Form>
	);
}
