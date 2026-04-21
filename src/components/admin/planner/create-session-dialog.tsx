import { IconClock, IconSparkles } from "@tabler/icons-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	createSessionWithPresentationsFn,
	unscheduledSubmissionsQueryOptions,
} from "@/utils/program-sessions.functions";
import { allProgramTracksQueryOptions } from "@/utils/program-tracks.functions";
import { allRoomsQueryOptions } from "@/utils/rooms.functions";
import { conferenceSettingsQueryOptions } from "@/utils/settings.functions";
import { RoomSelect } from "./shared/room-select";
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
	const [roomId, setRoomId] = useState<string>(rooms[0]?.id ?? "none");
	const [trackId, setTrackId] = useState<string>("none");
	const [slotMin, setSlotMin] = useState(settings.defaultPresentationMin);
	const [saving, setSaving] = useState(false);

	const durationMin = submissionIds.length * slotMin;
	const endAt = new Date(defaultStartAt.getTime() + durationMin * 60_000);

	const formatTime = (d: Date) =>
		d.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
			timeZone: timezone || undefined,
		});

	const handleClose = () => {
		setTitle("");
		setSlotMin(settings.defaultPresentationMin);
		setTrackId("none");
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
					roomId: roomId === "none" ? null : roomId,
					trackId: trackId === "none" ? null : trackId,
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
					<div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2">
						<IconClock size={14} className="shrink-0 text-muted-foreground" />
						<span className="text-sm font-medium tabular-nums">
							{formatTime(defaultStartAt)}
						</span>
						<span className="text-muted-foreground">→</span>
						<span className="text-sm font-medium tabular-nums">
							{formatTime(endAt)}
						</span>
						<span className="ml-auto text-xs text-muted-foreground">
							{durationMin} min
						</span>
					</div>

					<div className="space-y-2">
						<Label htmlFor="cs-title">Title</Label>
						<div className="relative">
							<Input
								id="cs-title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
								placeholder={suggested}
								data-testid="create-session-name"
								autoFocus
							/>
							{suggested && (
								<button
									type="button"
									onClick={() => setTitle(suggested)}
									className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
									title={`Use suggested: "${suggested}"`}
								>
									<IconSparkles size={10} />
									suggest
								</button>
							)}
						</div>
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
