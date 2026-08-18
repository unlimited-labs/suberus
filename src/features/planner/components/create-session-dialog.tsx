import { useSuspenseQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { addMinutes } from "date-fns";
import { allRoomsQueryOptions } from "@/features/planner/api/rooms";
import { allProgramTracksQueryOptions } from "@/features/planner/api/tracks";
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
import { useCreateSessionForm } from "./hooks/use-create-session-form";
import { RoomSelect } from "./shared/room-select";
import { TimeRangeSummary } from "./shared/time-range-summary";
import { TrackSelect } from "./shared/track-select";
import { Stepper } from "./stepper";

interface CreateSessionDialogProps {
	open: boolean;
	submissionIds: string[];
	defaultStartAt: Date;
	timezone?: string;
	onClose: () => void;
	onCreated: (sessionId: string) => void;
}

export function CreateSessionDialog({
	open,
	submissionIds,
	defaultStartAt,
	timezone,
	onClose,
	onCreated,
}: CreateSessionDialogProps) {
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const { data: tracks } = useSuspenseQuery(allProgramTracksQueryOptions());

	const { form, handleClose } = useCreateSessionForm({
		submissionIds,
		defaultStartAt,
		onClose,
		onCreated,
	});

	const slotMin = useSelector(form.store, (s) => s.values.slotMin);
	const untimedSlots = useSelector(form.store, (s) => s.values.untimedSlots);
	const sessionMin = useSelector(form.store, (s) => s.values.sessionMin);
	const durationMin = untimedSlots
		? sessionMin
		: submissionIds.length * slotMin;
	const endAt = addMinutes(defaultStartAt, durationMin);

	return (
		<Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
			<DialogContent
				data-testid="create-session-dialog"
				className="sm:max-w-sm"
			>
				<DialogHeader>
					<DialogTitle>
						Create session from {submissionIds.length}{" "}
						{submissionIds.length === 1 ? "submission" : "submissions"}
					</DialogTitle>
					<DialogDescription className="sr-only">
						Schedule a new program session from the selected submissions.
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
					<TimeRangeSummary
						start={defaultStartAt}
						end={endAt}
						totalMin={durationMin}
						timezone={timezone}
					/>

					<form.Field
						name="title"
						validators={{
							onSubmit: ({ value }) =>
								!value.trim() ? "Title is required" : undefined,
						}}
					>
						{(field) => {
							const errors = field.state.meta.errors;
							const hasError = errors.length > 0;
							return (
								<Field data-invalid={hasError} className="space-y-2">
									<Label htmlFor="cs-title">Title</Label>
									<Input
										id="cs-title"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										aria-invalid={hasError}
										placeholder="Session title"
										data-testid="create-session-name"
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
									testId="create-session-room"
								/>
							</div>
						)}
					</form.Field>

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

					<div className="flex items-start justify-between gap-4">
						<div className="space-y-0.5">
							<Label htmlFor="cs-untimed">Untimed presentations</Label>
							<p className="text-sm text-muted-foreground">
								Poster or lightning block: presentations share the session
								window instead of getting their own time slots.
							</p>
						</div>
						<form.Field name="untimedSlots">
							{(field) => (
								<Switch
									id="cs-untimed"
									data-testid="create-session-untimed"
									checked={field.state.value}
									onCheckedChange={(v) => field.handleChange(v === true)}
								/>
							)}
						</form.Field>
					</div>

					{untimedSlots ? (
						<form.Field name="sessionMin">
							{(field) => (
								<div className="space-y-2">
									<Label>Session length (minutes)</Label>
									<Stepper
										value={field.state.value}
										min={15}
										max={720}
										step={15}
										onChange={field.handleChange}
									/>
								</div>
							)}
						</form.Field>
					) : (
						<form.Field name="slotMin">
							{(field) => (
								<div className="space-y-2">
									<Label>Minutes per presentation</Label>
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
					)}

					<DialogFooter>
						<Button type="button" variant="outline" onClick={handleClose}>
							Cancel
						</Button>
						<form.AppForm>
							<form.SubmitButton
								label="Create"
								testId="create-session-submit"
							/>
						</form.AppForm>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
