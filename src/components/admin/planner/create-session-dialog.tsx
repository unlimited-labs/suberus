import { useStore } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { addMinutes } from "date-fns";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { allRoomsQueryOptions } from "@/server-fns/planner/rooms";
import { allProgramTracksQueryOptions } from "@/server-fns/planner/tracks";
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

	const slotMin = useStore(form.store, (s) => s.values.slotMin);
	const durationMin = submissionIds.length * slotMin;
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
