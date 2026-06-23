import type { EventFormProps } from "@ilamy/calendar";
import { IconClock, IconLayoutGrid } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { addMinutes } from "date-fns";
import { allRoomsQueryOptions } from "@/features/planner/api/rooms";
import { allSessionsQueryOptions } from "@/features/planner/api/sessions";
import { allProgramTracksQueryOptions } from "@/features/planner/api/tracks";
import { tzLocalInputToUtc } from "@/features/planner/tz-datetime";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Field, FieldError } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
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

	const type = useSelector(form.store, (s) => s.values.type);
	const startInput = useSelector(form.store, (s) => s.values.startInput);
	const presentationCount = useSelector(
		form.store,
		(s) => s.values.presentationCount,
	);
	const minutesPerPresentation = useSelector(
		form.store,
		(s) => s.values.minutesPerPresentation,
	);
	const breakDurationMin = useSelector(
		form.store,
		(s) => s.values.breakDurationMin,
	);

	const startDate = tzLocalInputToUtc(startInput, timezone);
	const sessionDurationMin = presentationCount * minutesPerPresentation;
	const sessionEndDate = addMinutes(startDate, sessionDurationMin);
	const breakEndDate = addMinutes(startDate, breakDurationMin);
	const endDate = type === "session" ? sessionEndDate : breakEndDate;
	const totalMin = type === "session" ? sessionDurationMin : breakDurationMin;

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
			<DialogContent data-testid="create-event-dialog" className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>
						{type === "session" ? "New session" : "New break"}
					</DialogTitle>
					<DialogDescription className="sr-only">
						Add a new session or break to the program schedule.
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						void form.handleSubmit();
					}}
					className="space-y-4"
				>
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
						<form.AppForm>
							<form.SubmitButton label="Create" testId="create-event-submit" />
						</form.AppForm>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
