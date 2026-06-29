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
import { useState } from "react";
import { toast } from "sonner";
import { importProgramTracksFromIntakeFn } from "@/features/planner/api/tracks";
import { llmStatusDotClass } from "@/features/planner/components/program/program-tab-helpers";
import type { RoomWithStats } from "@/features/planner/server/rooms";
import type { ProgramTrackWithStats } from "@/features/planner/server/tracks";
import type { ConferenceSettings } from "@/features/settings/api/settings";
import {
	conferenceSettingsQueryOptions,
	updateConferenceSettingsFn,
} from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import type { AppSettingsMap } from "@/features/settings/types";
import { getErrorMessage } from "@/shared/lib/error-message";
import { formatLlmStatus } from "@/shared/lib/format-llm-status";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { ProgramThemeSection } from "./program-theme-section";
import { ProgramTrackDialog } from "./program-track-dialog";
import { ProgramTracksList } from "./program-tracks-list";
import { RoomDialog } from "./room-dialog";
import { RoomsList } from "./rooms-list";

type LlmHealth = AppSettingsMap["SERVICE_HEALTH_LLM"];

interface ProgramTabProps {
	initialRooms: RoomWithStats[];
	initialProgramTracks: ProgramTrackWithStats[];
	initialConferenceSettings: ConferenceSettings;
	llmHealth: LlmHealth;
	onRoomsUpdate: () => void;
	onProgramTracksUpdate: () => void;
}

function LlmAutoplanNote({
	status,
	message,
	llmAvailable,
}: {
	status: string;
	message: string;
	llmAvailable: boolean;
}) {
	if (status === "misconfigured") {
		return (
			<p className="text-xs text-amber-700 dark:text-amber-400">
				LLM service is reachable but the configured model is invalid. {message}{" "}
				Autoplanning stays disabled until the model name is corrected.
			</p>
		);
	}
	if (!llmAvailable) {
		return (
			<p className="text-xs text-amber-700 dark:text-amber-400">
				LLM API is not available. Configure LLM_API_URL and ensure the service
				is running to enable autoplanning.
			</p>
		);
	}
	return null;
}

function PlannerSettingsSection({
	initialConferenceSettings,
	llmHealth,
}: {
	initialConferenceSettings: ConferenceSettings;
	llmHealth: LlmHealth;
}) {
	const queryClient = useQueryClient();
	const router = useRouter();
	const [plannerData, setPlannerData] = useState(initialConferenceSettings);
	const [plannerSaving, setPlannerSaving] = useState(false);
	const llmAvailable = llmHealth.status === "healthy";

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
			toast.error(getErrorMessage(error, "Failed to save"));
		} finally {
			setPlannerSaving(false);
		}
	};

	return (
		<SettingsSection
			icon={IconClock}
			title="Planner"
			description="Settings used by the program planner to organize presentations into sessions across rooms and days"
		>
			<div className="grid gap-6 sm:grid-cols-2">
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
								setPlannerData((prev) => ({ ...prev, dayEnd: e.target.value }))
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
			<div className="mt-6 space-y-2 border-t pt-6">
				<div className="flex items-center justify-between gap-4">
					<div className="space-y-0.5">
						<Label htmlFor="autoplanEnabled">
							Enable autoplanner (requires LLM access)
						</Label>
						<p className="text-sm text-muted-foreground">
							Lets admins cluster accepted abstracts into sessions and generate
							session titles via the LLM service.
						</p>
					</div>
					<Switch
						id="autoplanEnabled"
						checked={plannerData.autoplanEnabled}
						disabled={!llmAvailable}
						onCheckedChange={(v) =>
							setPlannerData((prev) => ({ ...prev, autoplanEnabled: v }))
						}
					/>
				</div>
				<div className="flex items-center gap-1.5">
					<div
						className={cn(
							"size-1.5 rounded-full",
							llmStatusDotClass(llmHealth.status),
						)}
					/>
					<span className="text-[11px] text-muted-foreground">
						{formatLlmStatus(llmHealth)}
					</span>
				</div>
				<LlmAutoplanNote
					status={llmHealth.status}
					message={llmHealth.message}
					llmAvailable={llmAvailable}
				/>
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
	);
}

function ProgramTracksSection({
	tracks,
	onUpdate,
	onEdit,
	onCreate,
}: {
	tracks: ProgramTrackWithStats[];
	onUpdate: () => void;
	onEdit: (track: ProgramTrackWithStats) => void;
	onCreate: () => void;
}) {
	const [importing, setImporting] = useState(false);

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
				onUpdate();
			}
		} catch (e) {
			toast.error(getErrorMessage(e, "Failed to import"));
		} finally {
			setImporting(false);
		}
	};

	return (
		<SettingsSection
			icon={IconColorSwatch}
			title="Program Tracks"
			description="Optional color tags for grouping related sessions (e.g. a multi-part series). Sessions can exist without a track."
		>
			<div className="mb-4 flex justify-end gap-2">
				<Button
					variant="outline"
					onClick={handleImport}
					disabled={importing}
					data-testid="import-program-tracks-from-intake"
				>
					<IconDownload className="mr-2 size-4" />
					Import from intake
				</Button>
				<Button onClick={onCreate} data-testid="create-program-track">
					<IconPlus className="mr-2 size-4" />
					Create Program Track
				</Button>
			</div>
			<ProgramTracksList tracks={tracks} onEdit={onEdit} onUpdate={onUpdate} />
		</SettingsSection>
	);
}

function RoomDialogSlot({
	editingRoom,
	open,
	onClose,
	onSuccess,
}: {
	editingRoom: RoomWithStats | undefined;
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
}) {
	return (
		<RoomDialog
			key={editingRoom?.id ?? "new-room"}
			open={open}
			onOpenChange={onClose}
			room={editingRoom}
			onSuccess={onSuccess}
		/>
	);
}

function TrackDialogSlot({
	editingTrack,
	open,
	onClose,
	onSuccess,
}: {
	editingTrack: ProgramTrackWithStats | undefined;
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
}) {
	return (
		<ProgramTrackDialog
			key={editingTrack?.id ?? "new-track"}
			open={open}
			onOpenChange={onClose}
			track={editingTrack}
			onSuccess={onSuccess}
		/>
	);
}

export function ProgramTab({
	initialRooms,
	initialProgramTracks,
	initialConferenceSettings,
	llmHealth,
	onRoomsUpdate,
	onProgramTracksUpdate,
}: ProgramTabProps) {
	const [roomDialogOpen, setRoomDialogOpen] = useState(false);
	const [editingRoom, setEditingRoom] = useState<RoomWithStats | undefined>();
	const [trackDialogOpen, setTrackDialogOpen] = useState(false);
	const [editingTrack, setEditingTrack] = useState<
		ProgramTrackWithStats | undefined
	>();

	const openRoomEdit = (room: RoomWithStats) => {
		setEditingRoom(room);
		setRoomDialogOpen(true);
	};
	const closeRoomDialog = () => {
		setRoomDialogOpen(false);
		setEditingRoom(undefined);
	};

	const openTrackEdit = (track: ProgramTrackWithStats) => {
		setEditingTrack(track);
		setTrackDialogOpen(true);
	};
	const closeTrackDialog = () => {
		setTrackDialogOpen(false);
		setEditingTrack(undefined);
	};

	return (
		<div className="space-y-6">
			<PlannerSettingsSection
				initialConferenceSettings={initialConferenceSettings}
				llmHealth={llmHealth}
			/>

			<ProgramThemeSection />

			<SettingsSection
				icon={IconBuildingCommunity}
				title="Rooms"
				description="Physical locations where sessions take place. Order controls column placement in the planner."
			>
				<div className="mb-4 flex justify-end">
					<Button
						onClick={() => setRoomDialogOpen(true)}
						data-testid="create-room"
					>
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

			<ProgramTracksSection
				tracks={initialProgramTracks}
				onUpdate={onProgramTracksUpdate}
				onEdit={openTrackEdit}
				onCreate={() => setTrackDialogOpen(true)}
			/>

			<RoomDialogSlot
				editingRoom={editingRoom}
				open={roomDialogOpen}
				onClose={closeRoomDialog}
				onSuccess={onRoomsUpdate}
			/>
			<TrackDialogSlot
				editingTrack={editingTrack}
				open={trackDialogOpen}
				onClose={closeTrackDialog}
				onSuccess={onProgramTracksUpdate}
			/>
		</div>
	);
}
