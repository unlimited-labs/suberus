import { IconSparkles } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDurationMin, utcToTzLocalInput } from "../tz-datetime";

interface Room {
	id: string;
	name: string;
}

interface Track {
	id: string;
	name: string;
	color: string | null;
}

interface Session {
	startAt: string | Date;
	endAt: string | Date;
	roomId: string | null;
	trackId: string | null;
	presentations: unknown[];
}

interface Props {
	session: Session;
	title: string;
	onTitleChange: (v: string) => void;
	onSaveTitle: () => void;
	tz: string | undefined;
	rooms: Room[];
	tracks: Track[];
	onTrackChange: (v: string) => void;
	onRoomChange: (v: string) => void;
	onStartChange: (v: string) => void;
	onDurationChange: (minutes: number) => void;
	onSuggestName: () => void;
}

export function SessionEditorHeader({
	session,
	title,
	onTitleChange,
	onSaveTitle,
	tz,
	rooms,
	tracks,
	onTrackChange,
	onRoomChange,
	onStartChange,
	onDurationChange,
	onSuggestName,
}: Props) {
	const currentDuration = formatDurationMin(
		new Date(session.startAt),
		new Date(session.endAt),
	);
	return (
		<SheetHeader className="gap-3 border-b p-4">
			<SheetTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				Session editor
			</SheetTitle>
			<div className="relative">
				<Input
					value={title}
					onChange={(e) => onTitleChange(e.target.value)}
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
						onChange={(e) => onStartChange(e.target.value)}
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
						defaultValue={currentDuration}
						key={`${String(session.startAt)}-${String(session.endAt)}`}
						onBlur={(e) => {
							const v = Number(e.target.value);
							if (v >= 5 && v !== currentDuration) onDurationChange(v);
						}}
						className="h-8 text-sm"
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1">
					<Label className="text-xs text-muted-foreground">Room</Label>
					<Select value={session.roomId ?? "none"} onValueChange={onRoomChange}>
						<SelectTrigger
							data-testid="session-editor-room"
							className="h-8 text-sm"
						>
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
				<div className="space-y-1">
					<Label className="text-xs text-muted-foreground">Track</Label>
					<Select
						value={session.trackId ?? "none"}
						onValueChange={onTrackChange}
					>
						<SelectTrigger
							data-testid="session-editor-track"
							className="h-8 text-sm"
						>
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
			</div>
		</SheetHeader>
	);
}
