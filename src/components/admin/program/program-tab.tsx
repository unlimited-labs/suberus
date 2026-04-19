import { IconDownload, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { importProgramTracksFromIntakeFn } from "@/utils/program-tracks.functions";
import type { ProgramTrackWithStats } from "@/utils/program-tracks.server";
import type { RoomWithStats } from "@/utils/rooms.server";
import { ProgramTrackDialog } from "./program-track-dialog";
import { ProgramTracksList } from "./program-tracks-list";
import { RoomDialog } from "./room-dialog";
import { RoomsList } from "./rooms-list";

interface ProgramTabProps {
	initialRooms: RoomWithStats[];
	initialProgramTracks: ProgramTrackWithStats[];
	onRoomsUpdate: () => void;
	onProgramTracksUpdate: () => void;
}

export function ProgramTab({
	initialRooms,
	initialProgramTracks,
	onRoomsUpdate,
	onProgramTracksUpdate,
}: ProgramTabProps) {
	const [roomDialogOpen, setRoomDialogOpen] = useState(false);
	const [editingRoom, setEditingRoom] = useState<RoomWithStats | null>(null);
	const [trackDialogOpen, setTrackDialogOpen] = useState(false);
	const [editingTrack, setEditingTrack] =
		useState<ProgramTrackWithStats | null>(null);
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
				onProgramTracksUpdate();
			}
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to import");
		} finally {
			setImporting(false);
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
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Rooms</CardTitle>
							<p className="text-sm text-muted-foreground">
								Physical locations where sessions take place. Order controls
								column placement in the planner.
							</p>
						</div>
						<Button onClick={() => setRoomDialogOpen(true)}>
							<IconPlus className="mr-2 size-4" />
							Create Room
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<RoomsList
						rooms={initialRooms}
						onEdit={openRoomEdit}
						onUpdate={onRoomsUpdate}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Program Tracks</CardTitle>
							<p className="text-sm text-muted-foreground">
								Color-coded groups used for schedule organization. Separate from
								submission-intake tracks.
							</p>
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={handleImport}
								disabled={importing}
							>
								<IconDownload className="mr-2 size-4" />
								Import from intake
							</Button>
							<Button onClick={() => setTrackDialogOpen(true)}>
								<IconPlus className="mr-2 size-4" />
								Create Program Track
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<ProgramTracksList
						tracks={initialProgramTracks}
						onEdit={openTrackEdit}
						onUpdate={onProgramTracksUpdate}
					/>
				</CardContent>
			</Card>

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
