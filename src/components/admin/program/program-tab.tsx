import {
	IconBuildingCommunity,
	IconClock,
	IconColorSwatch,
	IconDownload,
	IconLoader2,
	IconPlus,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimezoneCombobox } from "@/components/ui/timezone-combobox";
import { importProgramTracksFromIntakeFn } from "@/utils/program-tracks.functions";
import type { ProgramTrackWithStats } from "@/utils/program-tracks.server";
import type { RoomWithStats } from "@/utils/rooms.server";
import type { ConferenceSettings } from "@/utils/settings.functions";
import {
	conferenceSettingsQueryOptions,
	updateConferenceSettingsFn,
} from "@/utils/settings.functions";
import { ProgramTrackDialog } from "./program-track-dialog";
import { ProgramTracksList } from "./program-tracks-list";
import { RoomDialog } from "./room-dialog";
import { RoomsList } from "./rooms-list";

interface ProgramTabProps {
	initialRooms: RoomWithStats[];
	initialProgramTracks: ProgramTrackWithStats[];
	initialConferenceSettings: ConferenceSettings;
	onRoomsUpdate: () => void;
	onProgramTracksUpdate: () => void;
}

export function ProgramTab({
	initialRooms,
	initialProgramTracks,
	initialConferenceSettings,
	onRoomsUpdate,
	onProgramTracksUpdate,
}: ProgramTabProps) {
	const queryClient = useQueryClient();
	const router = useRouter();
	const [roomDialogOpen, setRoomDialogOpen] = useState(false);
	const [editingRoom, setEditingRoom] = useState<RoomWithStats | null>(null);
	const [trackDialogOpen, setTrackDialogOpen] = useState(false);
	const [editingTrack, setEditingTrack] =
		useState<ProgramTrackWithStats | null>(null);
	const [importing, setImporting] = useState(false);
	const [plannerData, setPlannerData] = useState(initialConferenceSettings);
	const [plannerSaving, setPlannerSaving] = useState(false);
	const timezoneFromBrowser = initialConferenceSettings.timezone === "";

	useEffect(() => {
		if (initialConferenceSettings.timezone === "") {
			const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
			if (browserTz) {
				setPlannerData((prev) => ({ ...prev, timezone: browserTz }));
			}
		}
	}, [initialConferenceSettings.timezone]);

	const handleImport = async () => {
		setImporting(true);
		try {
			const { created, skipped } = await importProgramTracksFromIntakeFn();
			if (created === 0) {
				toast.info("No new tracks to import", {
					description: `${skipped} intake track(s) already present`,
				});
			} else {
				toast.success(`Imported ${created} track(s)`, {
					description:
						skipped > 0 ? `${skipped} skipped as duplicates` : undefined,
				});
				onProgramTracksUpdate();
			}
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to import");
		} finally {
			setImporting(false);
		}
	};

	const handlePlannerSave = async () => {
		setPlannerSaving(true);
		try {
			await updateConferenceSettingsFn({ data: plannerData });
			await queryClient.invalidateQueries({
				queryKey: conferenceSettingsQueryOptions().queryKey,
			});
			await router.invalidate();
			toast.success("Planner settings saved");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to save");
		} finally {
			setPlannerSaving(false);
		}
	};

	const openRoomEdit = (room: RoomWithStats) => {
		setEditingRoom(room);
		setRoomDialogOpen(true);
	};
	const closeRoomDialog = () => {
		setRoomDialogOpen(false);
		setEditingRoom(null);
	};

	const openTrackEdit = (track: ProgramTrackWithStats) => {
		setEditingTrack(track);
		setTrackDialogOpen(true);
	};
	const closeTrackDialog = () => {
		setTrackDialogOpen(false);
		setEditingTrack(null);
	};

	return (
		<div className="space-y-6">
			<SettingsSection
				icon={IconClock}
				title="Planner"
				description="Settings used by the program planner to organize presentations into sessions across rooms and days"
			>
				<div className="grid gap-6 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="timezone">Conference timezone</Label>
						<TimezoneCombobox
							id="timezone"
							value={plannerData.timezone}
							onChange={(v) =>
								setPlannerData((prev) => ({ ...prev, timezone: v }))
							}
						/>
						<p className="text-xs text-muted-foreground">
							{timezoneFromBrowser
								? "Detected from your browser. Click Save to confirm."
								: "All session start/end times are stored in UTC and displayed in this zone."}
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="dayStart">Planner visible hours</Label>
						<div className="flex items-center gap-2">
							<Input
								id="dayStart"
								type="time"
								value={plannerData.dayStart}
								onChange={(e) =>
									setPlannerData((prev) => ({
										...prev,
										dayStart: e.target.value,
									}))
								}
								className="w-32"
							/>
							<span className="text-muted-foreground">-</span>
							<Input
								id="dayEnd"
								type="time"
								value={plannerData.dayEnd}
								onChange={(e) =>
									setPlannerData((prev) => ({
										...prev,
										dayEnd: e.target.value,
									}))
								}
								className="w-32"
							/>
						</div>
						<p className="text-xs text-muted-foreground">
							Visible window in the planner grid.
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="defaultPresentationMin">
							Default presentation length
						</Label>
						<div className="flex items-center gap-2">
							<Input
								id="defaultPresentationMin"
								type="number"
								min={5}
								max={480}
								step={5}
								value={plannerData.defaultPresentationMin}
								onChange={(e) =>
									setPlannerData((prev) => ({
										...prev,
										defaultPresentationMin: Number(e.target.value) || 15,
									}))
								}
								className="w-24"
							/>
							<span className="text-sm text-muted-foreground">minutes</span>
						</div>
						<p className="text-xs text-muted-foreground">
							Pre-filled when creating sessions and dropping submissions.
						</p>
					</div>
				</div>
				<div className="mt-6 flex justify-end">
					<Button onClick={handlePlannerSave} disabled={plannerSaving}>
						{plannerSaving && (
							<IconLoader2 className="mr-2 size-4 animate-spin" />
						)}
						Save
					</Button>
				</div>
			</SettingsSection>

			<SettingsSection
				icon={IconBuildingCommunity}
				title="Rooms"
				description="Physical locations where sessions take place. Order controls column placement in the planner."
			>
				<div className="mb-4 flex justify-end">
					<Button onClick={() => setRoomDialogOpen(true)}>
						<IconPlus className="mr-2 size-4" />
						Create Room
					</Button>
				</div>
				<RoomsList
					rooms={initialRooms}
					onEdit={openRoomEdit}
					onUpdate={onRoomsUpdate}
				/>
			</SettingsSection>

			<SettingsSection
				icon={IconColorSwatch}
				title="Program Tracks"
				description="Optional color tags for grouping related sessions (e.g. a multi-part series). Sessions can exist without a track."
			>
				<div className="mb-4 flex justify-end gap-2">
					<Button variant="outline" onClick={handleImport} disabled={importing}>
						<IconDownload className="mr-2 size-4" />
						Import from intake
					</Button>
					<Button onClick={() => setTrackDialogOpen(true)}>
						<IconPlus className="mr-2 size-4" />
						Create Program Track
					</Button>
				</div>
				<ProgramTracksList
					tracks={initialProgramTracks}
					onEdit={openTrackEdit}
					onUpdate={onProgramTracksUpdate}
				/>
			</SettingsSection>

			<RoomDialog
				key={editingRoom?.id ?? "new-room"}
				open={roomDialogOpen}
				onOpenChange={closeRoomDialog}
				room={editingRoom ?? undefined}
				onSuccess={onRoomsUpdate}
			/>

			<ProgramTrackDialog
				key={editingTrack?.id ?? "new-track"}
				open={trackDialogOpen}
				onOpenChange={closeTrackDialog}
				track={editingTrack ?? undefined}
				onSuccess={onProgramTracksUpdate}
			/>
		</div>
	);
}
