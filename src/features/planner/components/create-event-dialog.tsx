import type { EventFormProps } from "@ilamy/calendar";
import {
	IconCalendarEvent,
	IconClock,
	IconLayoutGrid,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { addMinutes, differenceInMinutes } from "date-fns";
import { allRoomsQueryOptions } from "@/features/planner/api/rooms";
import { allSessionsQueryOptions } from "@/features/planner/api/sessions";
import { allProgramTracksQueryOptions } from "@/features/planner/api/tracks";
import { tzLocalInputToUtc } from "@/features/planner/tz-datetime";
import { Form } from "@/shared/components/composable/form";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
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
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
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

	const submissionAttempts = useSelector(
		form.store,
		(s) => s.submissionAttempts,
	);
	const type = useSelector(form.store, (s) => s.values.type);
	const startInput = useSelector(form.store, (s) => s.values.startInput);
	const endInput = useSelector(form.store, (s) => s.values.endInput);
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
	const untimedSlots = useSelector(form.store, (s) => s.values.untimedSlots);
	const untimedSession = type === "session" && untimedSlots;

	const startDate = tzLocalInputToUtc(startInput, timezone);
	const sessionDurationMin = presentationCount * minutesPerPresentation;
	const sessionEndDate = addMinutes(startDate, sessionDurationMin);
	const breakEndDate = addMinutes(startDate, breakDurationMin);
	const eventEndDate = tzLocalInputToUtc(endInput, timezone);
	const endDate =
		untimedSession || type === "event"
			? eventEndDate
			: type === "session"
				? sessionEndDate
				: breakEndDate;
	const totalMin =
		untimedSession || type === "event"
			? Math.max(0, differenceInMinutes(eventEndDate, startDate))
			: type === "session"
				? sessionDurationMin
				: breakDurationMin;

	return (
		<Dialog onOpenChange={(isOpen) => !isOpen && handleClose()} open={open}>
			<DialogContent className="sm:max-w-sm" data-testid="create-event-dialog">
				<DialogHeader>
					<DialogTitle>
						{type === "session"
							? "New session"
							: type === "event"
								? "New event"
								: "New break"}
					</DialogTitle>
					<DialogDescription className="sr-only">
						Add a new session, break, or event to the program schedule.
					</DialogDescription>
				</DialogHeader>

				<Form
					className="space-y-4"
					onSubmit={() => {
						void form.handleSubmit();
					}}
				>
					<form.Field name="type">
						{(field) => (
							<div className="grid grid-cols-3 gap-2">
								{(["session", "break", "event"] as const).map((t) => (
									<button
										className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
											field.state.value === t
												? "border-primary bg-primary text-primary-foreground"
												: "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
										}`}
										data-testid={`create-event-type-${t}`}
										key={t}
										onClick={() => field.handleChange(t)}
										type="button"
									>
										{t === "session" ? (
											<IconLayoutGrid size={14} />
										) : t === "event" ? (
											<IconCalendarEvent size={14} />
										) : (
											<IconClock size={14} />
										)}
										{t === "session"
											? "Session"
											: t === "event"
												? "Event"
												: "Break"}
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
									data-testid="create-event-start"
									id="event-start"
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									type="datetime-local"
									value={field.state.value}
								/>
							</div>
						)}
					</form.Field>

					{type === "session" && (
						<div className="flex items-start justify-between gap-4">
							<div className="space-y-0.5">
								<Label htmlFor="event-untimed">Untimed presentations</Label>
								<p className="text-muted-foreground text-xs">
									Poster or lightning block: presentations share the session
									window instead of getting their own slots.
								</p>
							</div>
							<form.Field name="untimedSlots">
								{(field) => (
									<Switch
										checked={field.state.value}
										data-testid="create-event-untimed"
										id="event-untimed"
										onCheckedChange={(v) => field.handleChange(v === true)}
									/>
								)}
							</form.Field>
						</div>
					)}

					{type === "session" && !untimedSlots ? (
						<div className="grid grid-cols-2 gap-4">
							<form.Field name="presentationCount">
								{(field) => (
									<div className="space-y-2">
										<Label>Presentations</Label>
										<Stepper
											max={20}
											min={1}
											onChange={field.handleChange}
											value={field.state.value}
										/>
									</div>
								)}
							</form.Field>
							<form.Field name="minutesPerPresentation">
								{(field) => (
									<div className="space-y-2">
										<Label>Min / talk</Label>
										<Stepper
											max={120}
											min={5}
											onChange={field.handleChange}
											step={5}
											value={field.state.value}
										/>
									</div>
								)}
							</form.Field>
						</div>
					) : untimedSession || type === "event" ? (
						<form.Field name="endInput">
							{(field) => {
								const errors = isFieldErrorVisible(
									field.state.meta,
									submissionAttempts,
								)
									? field.state.meta.errors
									: [];
								const hasError = errors.length > 0;
								return (
									<Field className="space-y-2" data-invalid={hasError}>
										<Label htmlFor="event-end">End</Label>
										<Input
											aria-invalid={hasError}
											data-testid="create-event-end"
											id="event-end"
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											type="datetime-local"
											value={field.state.value}
										/>
										<FieldError errors={hasError ? errors : undefined} />
									</Field>
								);
							}}
						</form.Field>
					) : (
						<form.Field name="breakDurationMin">
							{(field) => (
								<div className="space-y-2">
									<Label>Duration</Label>
									<Stepper
										max={180}
										min={5}
										onChange={field.handleChange}
										step={5}
										value={field.state.value}
									/>
								</div>
							)}
						</form.Field>
					)}

					<TimeRangeSummary
						compact
						end={endDate}
						extra={
							type === "session" && !untimedSlots ? (
								<span className="ml-1 opacity-60">
									({presentationCount} × {minutesPerPresentation})
								</span>
							) : null
						}
						start={startDate}
						timezone={timezone}
						totalMin={totalMin}
					/>

					<form.Field
						name="title"
						validators={{
							onSubmit: ({ value }) =>
								type !== "session" && !value.trim()
									? "Title is required"
									: undefined,
						}}
					>
						{(field) => {
							const errors = isFieldErrorVisible(
								field.state.meta,
								submissionAttempts,
							)
								? field.state.meta.errors
								: [];
							const hasError = errors.length > 0;
							return (
								<Field className="space-y-2" data-invalid={hasError}>
									<Label htmlFor="event-title">
										{type === "session" ? "Title (optional)" : "Title"}
									</Label>
									<Input
										aria-invalid={hasError}
										autoFocus
										data-testid="create-event-title"
										id="event-title"
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder={
											type === "session"
												? `Session ${sessions.length + 1}`
												: undefined
										}
										value={field.state.value}
									/>
									<FieldError errors={hasError ? errors : undefined} />
								</Field>
							);
						}}
					</form.Field>

					{type === "event" && (
						<>
							<form.Field name="description">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor="event-description">
											Description (optional)
										</Label>
										<Textarea
											data-testid="create-event-description"
											id="event-description"
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
									<div className="space-y-2">
										<Label htmlFor="event-location">Location (optional)</Label>
										<Input
											data-testid="create-event-location"
											id="event-location"
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											value={field.state.value}
										/>
									</div>
								)}
							</form.Field>
							<form.Field name="locationUrl">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor="event-location-url">Link (optional)</Label>
										<Input
											data-testid="create-event-location-url"
											id="event-location-url"
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											type="url"
											value={field.state.value}
										/>
									</div>
								)}
							</form.Field>
						</>
					)}

					{type !== "event" && (
						<form.Field name="roomId">
							{(field) => (
								<div className="space-y-2">
									<Label>Room</Label>
									<RoomSelect
										onValueChange={field.handleChange}
										rooms={rooms}
										value={field.state.value}
									/>
								</div>
							)}
						</form.Field>
					)}

					{type === "session" && (
						<form.Field name="trackId">
							{(field) => (
								<div className="space-y-2">
									<Label>Track</Label>
									<TrackSelect
										onValueChange={field.handleChange}
										tracks={tracks}
										value={field.state.value}
									/>
								</div>
							)}
						</form.Field>
					)}

					<DialogFooter>
						<Button onClick={handleClose} type="button" variant="outline">
							Cancel
						</Button>
						<form.AppForm>
							<form.SubmitButton label="Create" testId="create-event-submit" />
						</form.AppForm>
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
