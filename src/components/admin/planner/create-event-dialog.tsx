import type { EventFormProps } from "@ilamy/calendar";
import { IconClock, IconLayoutGrid } from "@tabler/icons-react";
import { useStore } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitForm } from "@/lib/form-utils";
import { tzLocalInputToUtc } from "@/lib/tz-datetime";
import { allRoomsQueryOptions } from "@/server-fns/planner/rooms";
import { allSessionsQueryOptions } from "@/server-fns/planner/sessions";
import { allProgramTracksQueryOptions } from "@/server-fns/planner/tracks";
import { useCreateEventForm } from "./hooks/use-create-event-form";
import { RoomSelect } from "./shared/room-select";
import { TimeRangeSummary } from "./shared/time-range-summary";
import { TrackSelect } from "./shared/track-select";
import { Stepper } from "./stepper";

interface CreateEventDialogProps extends EventFormProps {
	timezone?: string;
}

export function CreateEventDialog({
	open,
	selectedEvent,
	onClose,
	timezone,
}: CreateEventDialogProps) {
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const { data: tracks } = useSuspenseQuery(allProgramTracksQueryOptions());
	const { data: sessions } = useSuspenseQuery(allSessionsQueryOptions());

	const { form, handleClose } = useCreateEventForm({
		selectedEvent,
		timezone,
		onClose,
	});

	const type = useStore(form.store, (s) => s.values.type);
	const startInput = useStore(form.store, (s) => s.values.startInput);
	const presentationCount = useStore(
		form.store,
		(s) => s.values.presentationCount,
	);
	const minutesPerPresentation = useStore(
		form.store,
		(s) => s.values.minutesPerPresentation,
	);
	const breakDurationMin = useStore(
		form.store,
		(s) => s.values.breakDurationMin,
	);

	const startDate = tzLocalInputToUtc(startInput, timezone);
	const sessionDurationMin = presentationCount * minutesPerPresentation;
	const sessionEndDate = new Date(
		startDate.getTime() + sessionDurationMin * 60_000,
	);
	const breakEndDate = new Date(
		startDate.getTime() + breakDurationMin * 60_000,
	);
	const endDate = type === "session" ? sessionEndDate : breakEndDate;
	const totalMin = type === "session" ? sessionDurationMin : breakDurationMin;

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
			<DialogContent data-testid="create-event-dialog" className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>
						{type === "session" ? "New session" : "New break"}
					</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						void submitForm(form);
					}}
					className="space-y-4"
				>
					{/* Type toggle */}
					<form.Field name="type">
						{(field) => (
							<div className="grid grid-cols-2 gap-2">
								{(["session", "break"] as const).map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => field.handleChange(t)}
										data-testid={`create-event-type-${t}`}
										className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
											field.state.value === t
												? "border-primary bg-primary text-primary-foreground"
												: "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
										}`}
									>
										{t === "session" ? (
											<IconLayoutGrid size={14} />
										) : (
											<IconClock size={14} />
										)}
										{t === "session" ? "Session" : "Break"}
									</button>
								))}
							</div>
						)}
					</form.Field>

					{/* Start time */}
					<form.Field name="startInput">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="event-start">Start</Label>
								<Input
									id="event-start"
									type="datetime-local"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									data-testid="create-event-start"
								/>
							</div>
						)}
					</form.Field>

					{/* Duration controls */}
					{type === "session" ? (
						<div className="grid grid-cols-2 gap-4">
							<form.Field name="presentationCount">
								{(field) => (
									<div className="space-y-2">
										<Label>Presentations</Label>
										<Stepper
											value={field.state.value}
											min={1}
											max={20}
											onChange={field.handleChange}
										/>
									</div>
								)}
							</form.Field>
							<form.Field name="minutesPerPresentation">
								{(field) => (
									<div className="space-y-2">
										<Label>Min / talk</Label>
										<Stepper
											value={field.state.value}
											min={5}
											max={120}
											step={5}
											onChange={field.handleChange}
										/>
									</div>
								)}
							</form.Field>
						</div>
					) : (
						<form.Field name="breakDurationMin">
							{(field) => (
								<div className="space-y-2">
									<Label>Duration</Label>
									<Stepper
										value={field.state.value}
										min={5}
										max={180}
										step={5}
										onChange={field.handleChange}
									/>
								</div>
							)}
						</form.Field>
					)}

					<TimeRangeSummary
						compact
						start={startDate}
						end={endDate}
						totalMin={totalMin}
						timezone={timezone}
						extra={
							type === "session" ? (
								<span className="ml-1 opacity-60">
									({presentationCount} × {minutesPerPresentation})
								</span>
							) : null
						}
					/>

					{/* Title */}
					<form.Field
						name="title"
						validators={{
							onSubmit: ({ value }) =>
								type === "break" && !value.trim()
									? "Title is required"
									: undefined,
						}}
					>
						{(field) => {
							const errors = field.state.meta.errors;
							const hasError = errors.length > 0;
							return (
								<Field data-invalid={hasError} className="space-y-2">
									<Label htmlFor="event-title">
										{type === "session" ? "Title (optional)" : "Title"}
									</Label>
									<Input
										id="event-title"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										aria-invalid={hasError}
										placeholder={
											type === "session"
												? `Session ${sessions.length + 1}`
												: "Break title"
										}
										data-testid="create-event-title"
										autoFocus
									/>
									<FieldError errors={hasError ? errors : undefined} />
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="roomId">
						{(field) => (
							<div className="space-y-2">
								<Label>Room</Label>
								<RoomSelect
									value={field.state.value}
									onValueChange={field.handleChange}
									rooms={rooms}
								/>
							</div>
						)}
					</form.Field>

					{type === "session" && (
						<form.Field name="trackId">
							{(field) => (
								<div className="space-y-2">
									<Label>Track</Label>
									<TrackSelect
										value={field.state.value}
										onValueChange={field.handleChange}
										tracks={tracks}
									/>
								</div>
							)}
						</form.Field>
					)}

					<DialogFooter>
						<Button type="button" variant="outline" onClick={handleClose}>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={form.state.isSubmitting}
							data-testid="create-event-submit"
						>
							Create
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
