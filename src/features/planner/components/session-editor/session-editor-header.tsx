import { useStore } from "@tanstack/react-store";
import { formatDurationShort } from "@/shared/lib/format-date";
import { Field, FieldError } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { Switch } from "@/shared/ui/switch";
import { RoomSelect } from "../shared/room-select";
import { TrackSelect } from "../shared/track-select";
import { useSessionEditor } from "./session-editor-context";

export function SessionEditorHeader() {
	const { rooms, tracks, form } = useSessionEditor();
	const slotCount = useStore(form.store, (s) => s.values.slotCount);
	const slotMin = useStore(form.store, (s) => s.values.slotMin);
	const untimedSlots = useStore(form.store, (s) => s.values.untimedSlots);
	const computedDuration = slotCount * slotMin;

	return (
		<SheetHeader className="gap-3 border-b p-4">
			<SheetTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				Session editor
			</SheetTitle>
			<form.Field name="title">
				{(field) => (
					<Field data-invalid={field.state.meta.errors.length > 0}>
						<Input
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && form.handleSubmit()}
							data-testid="session-editor-title"
							className="text-base font-medium"
							placeholder="Session title"
						/>
						<FieldError errors={field.state.meta.errors} />
					</Field>
				)}
			</form.Field>
			<form.Field name="startLocal">
				{(field) => (
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
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							data-testid="session-editor-start"
							className="h-8 text-sm"
						/>
					</div>
				)}
			</form.Field>
			<div className="flex items-center justify-between gap-3">
				<Label
					htmlFor="session-untimed"
					className="text-xs text-muted-foreground"
				>
					Untimed presentations (poster / lightning)
				</Label>
				<form.Field name="untimedSlots">
					{(field) => (
						<Switch
							id="session-untimed"
							data-testid="session-editor-untimed"
							checked={field.state.value}
							onCheckedChange={(v) => field.handleChange(v === true)}
						/>
					)}
				</form.Field>
			</div>
			{untimedSlots ? (
				<form.Field name="endLocal">
					{(field) => (
						<Field data-invalid={field.state.meta.errors.length > 0}>
							<Label
								htmlFor="session-end"
								className="text-xs text-muted-foreground"
							>
								End
							</Label>
							<Input
								id="session-end"
								type="datetime-local"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								data-testid="session-editor-end"
								className="h-8 text-sm"
							/>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
			) : (
				<div className="grid grid-cols-2 gap-3">
					<form.Field name="slotCount">
						{(field) => (
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
									value={field.state.value}
									data-testid="session-editor-slots-count"
									onChange={(e) =>
										field.handleChange(Math.max(1, Number(e.target.value)))
									}
									className="h-8 text-sm"
								/>
							</div>
						)}
					</form.Field>
					<form.Field name="slotMin">
						{(field) => (
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
									value={field.state.value}
									data-testid="session-editor-slots-min"
									onChange={(e) =>
										field.handleChange(Math.max(1, Number(e.target.value)))
									}
									className="h-8 text-sm"
								/>
							</div>
						)}
					</form.Field>
				</div>
			)}
			{!untimedSlots && (
				<p className="text-[11px] text-muted-foreground">
					Session duration:{" "}
					<span className="font-medium text-foreground">
						{formatDurationShort(computedDuration)}
					</span>{" "}
					({slotCount} × {slotMin} min)
				</p>
			)}
			<div className="grid grid-cols-2 gap-3">
				<form.Field name="roomId">
					{(field) => (
						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">Room</Label>
							<RoomSelect
								value={field.state.value}
								onValueChange={(v) => field.handleChange(v)}
								rooms={rooms}
								testId="session-editor-room"
								triggerClassName="h-8 text-sm"
							/>
						</div>
					)}
				</form.Field>
				<form.Field name="trackId">
					{(field) => (
						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">Track</Label>
							<TrackSelect
								value={field.state.value}
								onValueChange={(v) => field.handleChange(v)}
								tracks={tracks}
								testId="session-editor-track"
								triggerClassName="h-8 text-sm"
							/>
						</div>
					)}
				</form.Field>
			</div>
		</SheetHeader>
	);
}
