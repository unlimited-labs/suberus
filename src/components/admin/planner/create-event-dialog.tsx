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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { createSessionFn } from "@/utils/program-sessions.functions";
import { allProgramTracksQueryOptions } from "@/utils/program-tracks.functions";
import { allRoomsQueryOptions } from "@/utils/rooms.functions";
import { createBreakFn } from "@/utils/schedule-breaks.functions";
import { conferenceSettingsQueryOptions } from "@/utils/settings.functions";
import { Stepper } from "./stepper";
import { tzLocalInputToUtc, utcToTzLocalInput } from "./tz-datetime";

interface CreateEventDialogProps extends EventFormProps {
	onCreated: () => void;
	timezone?: string;
}

type EventType = "session" | "break";

export function CreateEventDialog({
	open,
	selectedEvent,
	onClose,
	onCreated,
	timezone,
}: CreateEventDialogProps) {
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const { data: tracks } = useSuspenseQuery(allProgramTracksQueryOptions());
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());

	const startRaw = selectedEvent?.start as
		| { toDate?: () => Date }
		| Date
		| string
		| undefined;
	const resourceId =
		typeof selectedEvent?.resourceId === "string"
			? selectedEvent.resourceId
			: undefined;

	const initialStart =
		startRaw == null
			? new Date()
			: typeof startRaw === "object" &&
					"toDate" in startRaw &&
					typeof startRaw.toDate === "function"
				? startRaw.toDate()
				: new Date(startRaw as string | Date);

	const [type, setType] = useState<EventType>("session");
	const [title, setTitle] = useState("");
	const [startInput, setStartInput] = useState<string>(
		utcToTzLocalInput(initialStart, timezone),
	);
	const [roomId, setRoomId] = useState<string>(
		resourceId ?? rooms[0]?.id ?? "",
	);
	const [trackId, setTrackId] = useState<string>("none");
	const [presentationCount, setPresentationCount] = useState(4);
	const [minutesPerPresentation, setMinutesPerPresentation] = useState(
		settings.defaultPresentationMin,
	);
	const [breakDurationMin, setBreakDurationMin] = useState(30);
	const [saving, setSaving] = useState(false);

	const startDate = tzLocalInputToUtc(startInput, timezone);

	const sessionDurationMin = presentationCount * minutesPerPresentation;
	const sessionEndDate = new Date(
		startDate.getTime() + sessionDurationMin * 60_000,
	);
	const breakEndDate = new Date(
		startDate.getTime() + breakDurationMin * 60_000,
	);

	const formatTime = (date: Date) =>
		date.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
			timeZone: timezone || undefined,
		});

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
		setTrackId("none");
		onClose();
	};

	const handleSubmit = async () => {
		if (!title.trim()) {
			toast.error("Title is required");
			return;
		}
		setSaving(true);
		try {
			if (type === "session") {
				await createSessionFn({
					data: {
						title: title.trim(),
						roomId: roomId === "none" ? null : roomId || null,
						trackId: trackId === "none" ? null : trackId,
						startAt: startDate.toISOString(),
						endAt: sessionEndDate.toISOString(),
					},
				});
			} else {
				await createBreakFn({
					data: {
						title: title.trim(),
						roomId: roomId === "none" ? null : roomId || null,
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
					<DialogTitle>New event</DialogTitle>
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

					{/* Time summary */}
					<div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2">
						<IconClock size={14} className="shrink-0 text-muted-foreground" />
						<span className="text-sm font-medium tabular-nums">
							{formatTime(startDate)}
						</span>
						<span className="text-muted-foreground">→</span>
						<span className="text-sm font-medium tabular-nums">
							{formatTime(endDate)}
						</span>
						<span className="ml-auto text-xs text-muted-foreground">
							{totalMin} min
							{type === "session" && (
								<span className="ml-1 opacity-60">
									({presentationCount} × {minutesPerPresentation})
								</span>
							)}
						</span>
					</div>

					{/* Title */}
					<div className="space-y-2">
						<Label htmlFor="event-title">Title</Label>
						<Input
							id="event-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
							placeholder={type === "session" ? "Session title" : "Break title"}
							data-testid="create-event-title"
							autoFocus
						/>
					</div>

					{/* Room */}
					<div className="space-y-2">
						<Label>Room</Label>
						<Select value={roomId} onValueChange={setRoomId}>
							<SelectTrigger>
								<SelectValue placeholder="No room" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">No room</SelectItem>
								{rooms.map((r) => (
									<SelectItem key={r.id} value={r.id}>
										{r.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Track — sessions only */}
					{type === "session" && (
						<div className="space-y-2">
							<Label>Track</Label>
							<Select value={trackId} onValueChange={setTrackId}>
								<SelectTrigger>
									<SelectValue placeholder="No track" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No track</SelectItem>
									{tracks.map((t) => (
										<SelectItem key={t.id} value={t.id}>
											<span className="flex items-center gap-2">
												{t.color && (
													<span
														className="size-2.5 shrink-0 rounded-full"
														style={{ backgroundColor: t.color }}
													/>
												)}
												{t.name}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

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
