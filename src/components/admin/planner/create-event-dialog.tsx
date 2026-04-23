import type { EventFormProps } from "@ilamy/calendar";
import { IconClock, IconLayoutGrid } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
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
import { tzLocalInputToUtc, utcToTzLocalInput } from "@/lib/tz-datetime";
import { createBreakFn } from "@/server-fns/planner/breaks";
import { allRoomsQueryOptions } from "@/server-fns/planner/rooms";
import {
	allSessionsQueryOptions,
	createSessionFn,
} from "@/server-fns/planner/sessions";
import { allProgramTracksQueryOptions } from "@/server-fns/planner/tracks";
import { conferenceSettingsQueryOptions } from "@/server-fns/settings";
import { usePlannerTools } from "./planner-tools-context";
import { RoomSelect } from "./shared/room-select";
import { TimeRangeSummary } from "./shared/time-range-summary";
import { TrackSelect } from "./shared/track-select";
import { Stepper } from "./stepper";

interface CreateEventDialogProps extends EventFormProps {
	timezone?: string;
}

type EventType = "session" | "break";

function toDate(raw: unknown): Date | null {
	if (raw == null) return null;
	if (raw instanceof Date) return raw;
	if (
		typeof raw === "object" &&
		"toDate" in raw &&
		typeof (raw as { toDate: unknown }).toDate === "function"
	) {
		const d = (raw as { toDate: () => Date }).toDate();
		return Number.isNaN(d.getTime()) ? null : d;
	}
	if (typeof raw === "string" || typeof raw === "number") {
		const d = new Date(raw);
		return Number.isNaN(d.getTime()) ? null : d;
	}
	return null;
}

export function CreateEventDialog({
	open,
	selectedEvent,
	onClose,
	timezone,
}: CreateEventDialogProps) {
	const { defaultStartAt, onCreated } = usePlannerTools();
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const { data: tracks } = useSuspenseQuery(allProgramTracksQueryOptions());
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());
	const { data: sessions } = useSuspenseQuery(allSessionsQueryOptions());

	const rawResourceId = selectedEvent?.resourceId;
	const resourceId =
		typeof rawResourceId === "string"
			? rawResourceId
			: typeof rawResourceId === "number"
				? String(rawResourceId)
				: undefined;

	const initialStart = toDate(selectedEvent?.start) ?? defaultStartAt;
	const clickedEnd = toDate(selectedEvent?.end);
	const clickedDurationMin =
		clickedEnd && clickedEnd.getTime() > initialStart.getTime()
			? Math.round((clickedEnd.getTime() - initialStart.getTime()) / 60_000)
			: null;

	const [type, setType] = useState<EventType>("session");
	const [title, setTitle] = useState("");
	const [startInput, setStartInput] = useState<string>(
		utcToTzLocalInput(initialStart, timezone),
	);
	const [roomId, setRoomId] = useState<string | null>(
		resourceId ?? rooms[0]?.id ?? null,
	);
	const [trackId, setTrackId] = useState<string | null>(null);
	const [presentationCount, setPresentationCount] = useState(4);
	const [minutesPerPresentation, setMinutesPerPresentation] = useState(
		settings.defaultPresentationMin,
	);
	const [breakDurationMin, setBreakDurationMin] = useState(
		clickedDurationMin != null
			? Math.min(180, Math.max(5, clickedDurationMin))
			: 30,
	);
	const [saving, setSaving] = useState(false);

	const startDate = tzLocalInputToUtc(startInput, timezone);

	const sessionDurationMin = presentationCount * minutesPerPresentation;
	const sessionEndDate = new Date(
		startDate.getTime() + sessionDurationMin * 60_000,
	);
	const breakEndDate = new Date(
		startDate.getTime() + breakDurationMin * 60_000,
	);

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) handleClose();
	};

	const handleClose = () => {
		setTitle("");
		setType("session");
		setStartInput(utcToTzLocalInput(initialStart, timezone));
		setPresentationCount(4);
		setMinutesPerPresentation(settings.defaultPresentationMin);
		setBreakDurationMin(30);
		setTrackId(null);
		onClose();
	};

	const handleSubmit = async () => {
		const trimmed = title.trim();
		if (type === "break" && !trimmed) {
			toast.error("Title is required");
			return;
		}
		setSaving(true);
		try {
			if (type === "session") {
				await createSessionFn({
					data: {
						title: trimmed || undefined,
						roomId,
						trackId,
						startAt: startDate.toISOString(),
						endAt: sessionEndDate.toISOString(),
					},
				});
			} else {
				await createBreakFn({
					data: {
						title: trimmed,
						roomId,
						startAt: startDate.toISOString(),
						endAt: breakEndDate.toISOString(),
					},
				});
			}
			onCreated();
			handleClose();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to create");
		} finally {
			setSaving(false);
		}
	};

	const endDate = type === "session" ? sessionEndDate : breakEndDate;
	const totalMin = type === "session" ? sessionDurationMin : breakDurationMin;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent data-testid="create-event-dialog" className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>
						{type === "session" ? "New session" : "New break"}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					{/* Type toggle */}
					<div className="grid grid-cols-2 gap-2">
						{(["session", "break"] as const).map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => setType(t)}
								data-testid={`create-event-type-${t}`}
								className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
									type === t
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

					{/* Start time */}
					<div className="space-y-2">
						<Label htmlFor="event-start">Start</Label>
						<Input
							id="event-start"
							type="datetime-local"
							value={startInput}
							onChange={(e) => setStartInput(e.target.value)}
							data-testid="create-event-start"
						/>
					</div>

					{/* Duration controls */}
					{type === "session" ? (
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Presentations</Label>
								<Stepper
									value={presentationCount}
									min={1}
									max={20}
									onChange={setPresentationCount}
								/>
							</div>
							<div className="space-y-2">
								<Label>Min / talk</Label>
								<Stepper
									value={minutesPerPresentation}
									min={5}
									max={120}
									step={5}
									onChange={setMinutesPerPresentation}
								/>
							</div>
						</div>
					) : (
						<div className="space-y-2">
							<Label>Duration</Label>
							<Stepper
								value={breakDurationMin}
								min={5}
								max={180}
								step={5}
								onChange={setBreakDurationMin}
							/>
						</div>
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
					<div className="space-y-2">
						<Label htmlFor="event-title">
							{type === "session" ? "Title (optional)" : "Title"}
						</Label>
						<Input
							id="event-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
							placeholder={
								type === "session"
									? `Session ${sessions.length + 1}`
									: "Break title"
							}
							data-testid="create-event-title"
							autoFocus
						/>
					</div>

					<div className="space-y-2">
						<Label>Room</Label>
						<RoomSelect
							value={roomId}
							onValueChange={setRoomId}
							rooms={rooms}
						/>
					</div>

					{type === "session" && (
						<div className="space-y-2">
							<Label>Track</Label>
							<TrackSelect
								value={trackId}
								onValueChange={setTrackId}
								tracks={tracks}
							/>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleClose}>
						Cancel
					</Button>
					<Button
						disabled={saving}
						onClick={handleSubmit}
						data-testid="create-event-submit"
					>
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
