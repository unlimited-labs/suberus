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
							className="text-base font-medium"
							data-testid="session-editor-title"
							onChange={(e) => field.handleChange(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && form.handleSubmit()}
							placeholder="Session title"
							value={field.state.value}
						/>
						<FieldError errors={field.state.meta.errors} />
					</Field>
				)}
			</form.Field>
			<form.Field name="startLocal">
				{(field) => (
					<div className="space-y-1">
						<Label
							className="text-xs text-muted-foreground"
							htmlFor="session-start"
						>
							Start
						</Label>
						<Input
							className="h-8 text-sm"
							data-testid="session-editor-start"
							id="session-start"
							onChange={(e) => field.handleChange(e.target.value)}
							type="datetime-local"
							value={field.state.value}
						/>
					</div>
				)}
			</form.Field>
			<div className="flex items-center justify-between gap-3">
				<Label
					className="text-xs text-muted-foreground"
					htmlFor="session-untimed"
				>
					Untimed presentations (poster / lightning)
				</Label>
				<form.Field name="untimedSlots">
					{(field) => (
						<Switch
							checked={field.state.value}
							data-testid="session-editor-untimed"
							id="session-untimed"
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
								className="text-xs text-muted-foreground"
								htmlFor="session-end"
							>
								End
							</Label>
							<Input
								className="h-8 text-sm"
								data-testid="session-editor-end"
								id="session-end"
								onChange={(e) => field.handleChange(e.target.value)}
								type="datetime-local"
								value={field.state.value}
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
									className="text-xs text-muted-foreground"
									htmlFor="session-slot-count"
								>
									Slots
								</Label>
								<Input
									className="h-8 text-sm"
									data-testid="session-editor-slots-count"
									id="session-slot-count"
									min={1}
									onChange={(e) =>
										field.handleChange(Math.max(1, Number(e.target.value)))
									}
									step={1}
									type="number"
									value={field.state.value}
								/>
							</div>
						)}
					</form.Field>
					<form.Field name="slotMin">
						{(field) => (
							<div className="space-y-1">
								<Label
									className="text-xs text-muted-foreground"
									htmlFor="session-slot-min"
								>
									Min / slot
								</Label>
								<Input
									className="h-8 text-sm"
									data-testid="session-editor-slots-min"
									id="session-slot-min"
									min={1}
									onChange={(e) =>
										field.handleChange(Math.max(1, Number(e.target.value)))
									}
									step={5}
									type="number"
									value={field.state.value}
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
								onValueChange={(v) => field.handleChange(v)}
								rooms={rooms}
								testId="session-editor-room"
								triggerClassName="h-8 text-sm"
								value={field.state.value}
							/>
						</div>
					)}
				</form.Field>
				<form.Field name="trackId">
					{(field) => (
						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">Track</Label>
							<TrackSelect
								onValueChange={(v) => field.handleChange(v)}
								testId="session-editor-track"
								tracks={tracks}
								triggerClassName="h-8 text-sm"
								value={field.state.value}
							/>
						</div>
					)}
				</form.Field>
			</div>
		</SheetHeader>
	);
}
