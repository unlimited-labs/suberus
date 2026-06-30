import { formatDurationShort } from "@/shared/lib/format-date";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { RoomSelect } from "../shared/room-select";
import { TrackSelect } from "../shared/track-select";
import { useSessionEditor } from "./session-editor-context";

export function SessionEditorHeader() {
	const { rooms, tracks, draft, onSave } = useSessionEditor();
	const { title, startLocal, slotCount, slotMin, roomId, trackId } =
		draft.values;
	const computedDuration = slotCount * slotMin;

	return (
		<SheetHeader className="gap-3 border-b p-4">
			<SheetTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				Session editor
			</SheetTitle>
			<Input
				value={title}
				onChange={(e) => draft.set("title", e.target.value)}
				onKeyDown={(e) => e.key === "Enter" && onSave()}
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
					value={startLocal}
					onChange={(e) => draft.set("startLocal", e.target.value)}
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
						onChange={(e) =>
							draft.set("slotCount", Math.max(1, Number(e.target.value)))
						}
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
						onChange={(e) =>
							draft.set("slotMin", Math.max(1, Number(e.target.value)))
						}
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
						value={roomId}
						onValueChange={(v) => draft.set("roomId", v)}
						rooms={rooms}
						testId="session-editor-room"
						triggerClassName="h-8 text-sm"
					/>
				</div>
				<div className="space-y-1">
					<Label className="text-xs text-muted-foreground">Track</Label>
					<TrackSelect
						value={trackId}
						onValueChange={(v) => draft.set("trackId", v)}
						tracks={tracks}
						testId="session-editor-track"
						triggerClassName="h-8 text-sm"
					/>
				</div>
			</div>
		</SheetHeader>
	);
}
