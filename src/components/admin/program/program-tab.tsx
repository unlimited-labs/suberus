import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
						<Button onClick={() => setTrackDialogOpen(true)}>
							<IconPlus className="mr-2 size-4" />
							Create Program Track
						</Button>
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
