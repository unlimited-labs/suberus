import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReviewerUser } from "@/lib/server/reviewers";
import type { TrackWithStats } from "@/lib/server/tracks";
import { TrackDialog } from "./track-dialog";
import { TracksList } from "./tracks-list";

interface TracksTabProps {
	initialTracks: TrackWithStats[];
	reviewers: ReviewerUser[];
	onUpdate: () => void;
}

export function TracksTab({
	initialTracks,
	reviewers,
	onUpdate,
}: TracksTabProps) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingTrack, setEditingTrack] = useState<TrackWithStats | null>(null);

	const handleEdit = (track: TrackWithStats) => {
		setEditingTrack(track);
		setDialogOpen(true);
	};

	const handleCloseDialog = () => {
		setDialogOpen(false);
		setEditingTrack(null);
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Conference Tracks</CardTitle>
							<p className="text-sm text-muted-foreground">
								Thematic paths that group presentations by subject area
							</p>
						</div>
						<Button onClick={() => setDialogOpen(true)}>
							<IconPlus className="mr-2 size-4" />
							Create Track
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<TracksList
						tracks={initialTracks}
						onEdit={handleEdit}
						onUpdate={onUpdate}
					/>
				</CardContent>
			</Card>

			<TrackDialog
				key={editingTrack?.id ?? "new"}
				open={dialogOpen}
				onOpenChange={handleCloseDialog}
				track={editingTrack || undefined}
				reviewers={reviewers}
				onSuccess={onUpdate}
			/>
		</div>
	);
}
