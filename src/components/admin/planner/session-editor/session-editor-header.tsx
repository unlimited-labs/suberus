import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { utcToTzLocalInput } from "@/lib/tz-datetime";
import { conferenceSettingsQueryOptions } from "@/server-fns/settings";
import { formatDurationShort } from "@/shared/lib/format-date";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { RoomSelect } from "../shared/room-select";
import { TrackSelect } from "../shared/track-select";
import { useSessionEditor } from "./session-editor-context";

export function SessionEditorHeader() {
	const {
		session,
		tz,
		rooms,
		tracks,
		title,
		sessionDurationMin,
		sortedPresentations,
		mutations,
		onSaveTitle,
	} = useSessionEditor();
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());
	const defaultSlotMin = settings.defaultPresentationMin;

	const initialSlotMin = sortedPresentations[0]?.durationMin ?? defaultSlotMin;
	const initialSlotCount = Math.max(
		1,
		Math.round(sessionDurationMin / Math.max(1, initialSlotMin)),
	);

	const [slotCount, setSlotCount] = useState(initialSlotCount);
	const [slotMin, setSlotMin] = useState(initialSlotMin);

	// Re-sync only when the session or its presentations change — NOT when a
	// committed duration echoes back (initialSlotCount derives from duration),
	// which would clobber a value the user is typing in the other input.
	const syncKey = `${session.id}:${initialSlotMin}`;
	const [lastSyncKey, setLastSyncKey] = useState(syncKey);
	if (lastSyncKey !== syncKey) {
		setLastSyncKey(syncKey);
		setSlotCount(initialSlotCount);
		setSlotMin(initialSlotMin);
	}

	const computedDuration = slotCount * slotMin;

	const commit = (nextCount: number, nextMin: number) => {
		const total = Math.max(1, nextCount * nextMin);
		if (total !== sessionDurationMin) {
			mutations.updateDuration(total, session);
		}
	};
	return (
		<SheetHeader className="gap-3 border-b p-4">
			<SheetTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				Session editor
			</SheetTitle>
			<Input
				value={title.value}
				onChange={(e) => title.set(e.target.value)}
				onBlur={onSaveTitle}
				onKeyDown={(e) => e.key === "Enter" && onSaveTitle()}
				data-testid="session-editor-title"
				className="text-base font-medium"
				placeholder="Session title"
			/>
			<div className="space-y-1">
				<Label
					htmlFor="session-start"
					className="text-xs text-muted-foreground"
				>
					Start
				</Label>
				<Input
					id="session-start"
					type="datetime-local"
					value={utcToTzLocalInput(new Date(session.startAt), tz)}
					onChange={(e) => mutations.updateStart(e.target.value, tz, session)}
					data-testid="session-editor-start"
					className="h-8 text-sm"
				/>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1">
					<Label
						htmlFor="session-slot-count"
						className="text-xs text-muted-foreground"
					>
						Slots
					</Label>
					<Input
						id="session-slot-count"
						type="number"
						min={1}
						step={1}
						value={slotCount}
						data-testid="session-editor-slots-count"
						onChange={(e) => setSlotCount(Math.max(1, Number(e.target.value)))}
						onBlur={() => commit(slotCount, slotMin)}
						className="h-8 text-sm"
					/>
				</div>
				<div className="space-y-1">
					<Label
						htmlFor="session-slot-min"
						className="text-xs text-muted-foreground"
					>
						Min / slot
					</Label>
					<Input
						id="session-slot-min"
						type="number"
						min={1}
						step={5}
						value={slotMin}
						data-testid="session-editor-slots-min"
						onChange={(e) => setSlotMin(Math.max(1, Number(e.target.value)))}
						onBlur={() => commit(slotCount, slotMin)}
						className="h-8 text-sm"
					/>
				</div>
			</div>
			<p className="text-[11px] text-muted-foreground">
				Session duration:{" "}
				<span className="font-medium text-foreground">
					{formatDurationShort(computedDuration)}
				</span>{" "}
				({slotCount} × {slotMin} min)
			</p>
			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1">
					<Label className="text-xs text-muted-foreground">Room</Label>
					<RoomSelect
						value={session.roomId}
						onValueChange={mutations.updateRoom}
						rooms={rooms}
						testId="session-editor-room"
						triggerClassName="h-8 text-sm"
					/>
				</div>
				<div className="space-y-1">
					<Label className="text-xs text-muted-foreground">Track</Label>
					<TrackSelect
						value={session.trackId}
						onValueChange={mutations.updateTrack}
						tracks={tracks}
						testId="session-editor-track"
						triggerClassName="h-8 text-sm"
					/>
				</div>
			</div>
		</SheetHeader>
	);
}
