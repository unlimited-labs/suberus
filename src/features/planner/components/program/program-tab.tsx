import {
	IconBuildingCommunity,
	IconClock,
	IconColorSwatch,
	IconDownload,
	IconPlus,
} from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { importProgramTracksFromIntakeFn } from "@/features/planner/api/tracks";
import { llmStatusDotClass } from "@/features/planner/components/program/program-tab-helpers";
import type { RoomWithStats } from "@/features/planner/server/rooms";
import type { ProgramTrackWithStats } from "@/features/planner/server/tracks";
import type { ConferenceSettings } from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import type { AppSettingsMap } from "@/features/settings/types";
import { Form } from "@/shared/components/composable/form";
import { getErrorMessage } from "@/shared/lib/error-message";
import { formatLlmStatus } from "@/shared/lib/format-llm-status";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { usePlannerSettingsForm } from "./hooks/use-planner-settings-form";
import { ProgramBadgesSection } from "./program-badges-section";
import { ProgramThemeSection } from "./program-theme-section";
import { ProgramTrackDialog } from "./program-track-dialog";
import { ProgramTracksList } from "./program-tracks-list";
import { QrCodesSection } from "./qr-codes-section";
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
	const { form } = usePlannerSettingsForm(initialConferenceSettings);
	const llmAvailable = llmHealth.status === "healthy";

	return (
		<SettingsSection
			description="Settings used by the program planner to organize presentations into sessions across rooms and days"
			icon={IconClock}
			title="Planner"
		>
			<Form
				onSubmit={() => {
					void form.handleSubmit();
				}}
			>
				<div className="grid gap-6 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="dayStart">Planner visible hours</Label>
						<div className="flex items-center gap-2">
							<form.Field name="dayStart">
								{(field) => (
									<Input
										className="w-32"
										id="dayStart"
										onChange={(e) => field.handleChange(e.target.value)}
										type="time"
										value={field.state.value}
									/>
								)}
							</form.Field>
							<span className="text-muted-foreground">-</span>
							<form.Field name="dayEnd">
								{(field) => (
									<Input
										className="w-32"
										id="dayEnd"
										onChange={(e) => field.handleChange(e.target.value)}
										type="time"
										value={field.state.value}
									/>
								)}
							</form.Field>
						</div>
						<p className="text-muted-foreground text-xs">
							Visible window in the planner grid.
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="defaultPresentationMin">
							Default presentation length
						</Label>
						<div className="flex items-center gap-2">
							<form.Field name="defaultPresentationMin">
								{(field) => (
									<Input
										className="w-24"
										id="defaultPresentationMin"
										max={480}
										min={5}
										onChange={(e) =>
											field.handleChange(Number(e.target.value) || 15)
										}
										step={5}
										type="number"
										value={field.state.value}
									/>
								)}
							</form.Field>
							<span className="text-muted-foreground text-sm">minutes</span>
						</div>
						<p className="text-muted-foreground text-xs">
							Pre-filled when creating sessions and dropping submissions.
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="authorBufferMin">Author conflict buffer</Label>
						<div className="flex items-center gap-2">
							<form.Field name="authorBufferMin">
								{(field) => (
									<Input
										className="w-24"
										id="authorBufferMin"
										max={240}
										min={0}
										onChange={(e) =>
											field.handleChange(Number(e.target.value) || 0)
										}
										step={5}
										type="number"
										value={field.state.value}
									/>
								)}
							</form.Field>
							<span className="text-muted-foreground text-sm">minutes</span>
						</div>
						<p className="text-muted-foreground text-xs">
							Flags a co-author scheduled in two talks less than this far apart.
							Set 0 to require only that their talks don't overlap.
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="reminderLeadMin">
							Favourite reminder lead time
						</Label>
						<div className="flex items-center gap-2">
							<form.Field name="reminderLeadMin">
								{(field) => (
									<Input
										className="w-24"
										data-testid="reminder-lead-input"
										id="reminderLeadMin"
										max={120}
										min={1}
										onChange={(e) =>
											field.handleChange(Number(e.target.value) || 5)
										}
										type="number"
										value={field.state.value}
									/>
								)}
							</form.Field>
							<span className="text-muted-foreground text-sm">minutes</span>
						</div>
						<p className="text-muted-foreground text-xs">
							How long before a favourited talk starts attendees get the push
							notification.
						</p>
					</div>
				</div>
				<div className="mt-6 space-y-2 border-t pt-6">
					<div className="flex items-center justify-between gap-4">
						<div className="space-y-0.5">
							<Label htmlFor="autoplanEnabled">
								Enable autoplanner (requires LLM access)
							</Label>
							<p className="text-muted-foreground text-xs">
								Lets admins cluster accepted abstracts into sessions and
								generate session titles via the LLM service.
							</p>
						</div>
						<form.Field name="autoplanEnabled">
							{(field) => (
								<Switch
									checked={field.state.value}
									disabled={!llmAvailable}
									id="autoplanEnabled"
									onCheckedChange={(v) => field.handleChange(v === true)}
								/>
							)}
						</form.Field>
					</div>
					<div className="flex items-center gap-1.5">
						<div
							className={cn(
								"size-1.5 rounded-full",
								llmStatusDotClass(llmHealth.status),
							)}
						/>
						<span className="text-muted-foreground text-[11px]">
							{formatLlmStatus(llmHealth)}
						</span>
					</div>
					<LlmAutoplanNote
						llmAvailable={llmAvailable}
						message={llmHealth.message}
						status={llmHealth.status}
					/>
				</div>
				<div className="mt-6 flex justify-end">
					<form.AppForm>
						<form.SubmitButton
							label="Save"
							submittingLabel="Saving…"
							testId="planner-settings-save"
						/>
					</form.AppForm>
				</div>
			</Form>
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
		}
		setImporting(false);
	};

	return (
		<SettingsSection
			description="Optional color tags for grouping related sessions (e.g. a multi-part series). Sessions can exist without a track."
			icon={IconColorSwatch}
			title="Program Tracks"
		>
			<div className="mb-4 flex justify-end gap-2">
				<Button
					data-testid="import-program-tracks-from-intake"
					disabled={importing}
					onClick={handleImport}
					variant="outline"
				>
					<IconDownload className="mr-2 size-4" />
					Import from intake
				</Button>
				<Button data-testid="create-program-track" onClick={onCreate}>
					<IconPlus className="mr-2 size-4" />
					Create Program Track
				</Button>
			</div>
			<ProgramTracksList onEdit={onEdit} onUpdate={onUpdate} tracks={tracks} />
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
			onOpenChange={onClose}
			onSuccess={onSuccess}
			open={open}
			room={editingRoom}
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
			onOpenChange={onClose}
			onSuccess={onSuccess}
			open={open}
			track={editingTrack}
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
			<ProgramBadgesSection />
			<QrCodesSection />

			<SettingsSection
				description="Physical locations where sessions take place. Order controls column placement in the planner."
				icon={IconBuildingCommunity}
				title="Rooms"
			>
				<div className="mb-4 flex justify-end">
					<Button
						data-testid="create-room"
						onClick={() => setRoomDialogOpen(true)}
					>
						<IconPlus className="mr-2 size-4" />
						Create Room
					</Button>
				</div>
				<RoomsList
					onEdit={openRoomEdit}
					onUpdate={onRoomsUpdate}
					rooms={initialRooms}
				/>
			</SettingsSection>

			<ProgramTracksSection
				onCreate={() => setTrackDialogOpen(true)}
				onEdit={openTrackEdit}
				onUpdate={onProgramTracksUpdate}
				tracks={initialProgramTracks}
			/>

			<RoomDialogSlot
				editingRoom={editingRoom}
				onClose={closeRoomDialog}
				onSuccess={onRoomsUpdate}
				open={roomDialogOpen}
			/>
			<TrackDialogSlot
				editingTrack={editingTrack}
				onClose={closeTrackDialog}
				onSuccess={onProgramTracksUpdate}
				open={trackDialogOpen}
			/>
		</div>
	);
}
