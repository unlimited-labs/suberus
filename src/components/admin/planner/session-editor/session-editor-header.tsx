import { IconSparkles } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { utcToTzLocalInput } from "@/utils/tz-datetime";
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
		mutations,
		onSaveTitle,
		onSuggestName,
	} = useSessionEditor();
	return (
		<SheetHeader className="gap-3 border-b p-4">
			<SheetTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				Session editor
			</SheetTitle>
			<div className="relative">
				<Input
					value={title.value}
					onChange={(e) => title.set(e.target.value)}
					onBlur={onSaveTitle}
					onKeyDown={(e) => e.key === "Enter" && onSaveTitle()}
					data-testid="session-editor-title"
					className="pr-20 text-base font-medium"
					placeholder="Session title"
				/>
				{session.presentations.length >= 2 && (
					<button
						type="button"
						onClick={onSuggestName}
						className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
						title="Auto-suggest from presentations"
					>
						<IconSparkles size={10} />
						suggest
					</button>
				)}
			</div>
			<div className="grid grid-cols-2 gap-3">
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
				<div className="space-y-1">
					<Label
						htmlFor="session-duration"
						className="text-xs text-muted-foreground"
					>
						Duration (min)
					</Label>
					<Input
						id="session-duration"
						type="number"
						min={5}
						step={5}
						data-testid="session-editor-duration"
						defaultValue={sessionDurationMin}
						key={`${String(session.startAt)}-${String(session.endAt)}`}
						onBlur={(e) => {
							const v = Number(e.target.value);
							if (v >= 5 && v !== sessionDurationMin) {
								mutations.updateDuration(v, session);
							}
						}}
						className="h-8 text-sm"
					/>
				</div>
			</div>
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
