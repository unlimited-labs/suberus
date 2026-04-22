import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { allRoomsQueryOptions } from "@/server-fns/planner/rooms";
import {
	createSessionWithPresentationsFn,
	unscheduledSubmissionsQueryOptions,
} from "@/server-fns/planner/sessions";
import { allProgramTracksQueryOptions } from "@/server-fns/planner/tracks";
import { conferenceSettingsQueryOptions } from "@/server-fns/settings";
import { RoomSelect } from "./shared/room-select";
import { TimeRangeSummary } from "./shared/time-range-summary";
import { TitleWithSuggest } from "./shared/title-with-suggest";
import { TrackSelect } from "./shared/track-select";
import { Stepper } from "./stepper";
import { suggestSessionName } from "./suggest-session-name";

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
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());
	const { data: submissions } = useSuspenseQuery(
		unscheduledSubmissionsQueryOptions(),
	);

	const selected = useMemo(() => {
		const idSet = new Set(submissionIds);
		return submissions.filter((s) => idSet.has(s.id));
	}, [submissions, submissionIds]);
	const suggested = useMemo(() => suggestSessionName(selected), [selected]);

	const [title, setTitle] = useState("");
	const [roomId, setRoomId] = useState<string | null>(rooms[0]?.id ?? null);
	const [trackId, setTrackId] = useState<string | null>(null);
	const [slotMin, setSlotMin] = useState(settings.defaultPresentationMin);
	const [saving, setSaving] = useState(false);

	const durationMin = submissionIds.length * slotMin;
	const endAt = new Date(defaultStartAt.getTime() + durationMin * 60_000);

	const handleClose = () => {
		setTitle("");
		setSlotMin(settings.defaultPresentationMin);
		setTrackId(null);
		onClose();
	};

	const handleSubmit = async () => {
		const finalTitle = title.trim() || suggested;
		if (!finalTitle) {
			toast.error("Title is required");
			return;
		}
		setSaving(true);
		try {
			const { id } = await createSessionWithPresentationsFn({
				data: {
					title: finalTitle,
					roomId,
					trackId,
					startAt: defaultStartAt.toISOString(),
					endAt: endAt.toISOString(),
					slotDurationMin: slotMin,
					submissionIds,
				},
			});
			onCreated(id);
			handleClose();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to create session");
		} finally {
			setSaving(false);
		}
	};

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
				</DialogHeader>

				<div className="space-y-4">
					<TimeRangeSummary
						start={defaultStartAt}
						end={endAt}
						totalMin={durationMin}
						timezone={timezone}
					/>

					<div className="space-y-2">
						<Label htmlFor="cs-title">Title</Label>
						<TitleWithSuggest
							id="cs-title"
							value={title}
							onChange={setTitle}
							onEnter={handleSubmit}
							placeholder={suggested}
							suggestion={suggested}
							onApplySuggestion={() => setTitle(suggested)}
							suggestTitle={`Use suggested: "${suggested}"`}
							testId="create-session-name"
							autoFocus
						/>
					</div>

					<div className="space-y-2">
						<Label>Room</Label>
						<RoomSelect
							value={roomId}
							onValueChange={setRoomId}
							rooms={rooms}
							testId="create-session-room"
						/>
					</div>

					<div className="space-y-2">
						<Label>Track</Label>
						<TrackSelect
							value={trackId}
							onValueChange={setTrackId}
							tracks={tracks}
						/>
					</div>

					<div className="space-y-2">
						<Label>Minutes per presentation</Label>
						<Stepper
							value={slotMin}
							min={5}
							max={120}
							step={5}
							onChange={setSlotMin}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleClose}>
						Cancel
					</Button>
					<Button
						disabled={saving}
						onClick={handleSubmit}
						data-testid="create-session-submit"
					>
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
